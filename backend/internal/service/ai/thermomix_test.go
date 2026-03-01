package ai

import (
	"testing"
)

// TestSanitizeSteps_ZeroSpeedAndTemp asserts that AI-hallucinated "0" values
// for Speed and TempCelsius are normalised to "" before reaching Cookidoo.
// Without this fix, Cookidoo renders a visible "Speed 0" tag on the device screen.
func TestSanitizeSteps_ZeroSpeedAndTemp(t *testing.T) {
	tests := []struct {
		name        string
		input       ThermomixStep
		wantSpeed   string
		wantTemp    string
		wantTimeSec int
	}{
		{
			name:        `speed "0" is cleared`,
			input:       ThermomixStep{Text: "Shape into balls.", Speed: "0", TimeSeconds: 0},
			wantSpeed:   "",
			wantTemp:    "",
			wantTimeSec: 0,
		},
		{
			name:        `speed "0.0" is cleared`,
			input:       ThermomixStep{Text: "Rest the dough.", Speed: "0.0", TimeSeconds: 0},
			wantSpeed:   "",
			wantTemp:    "",
			wantTimeSec: 0,
		},
		{
			name:        `temp "0" is cleared`,
			input:       ThermomixStep{Text: "Serve.", TempCelsius: "0", TimeSeconds: 0},
			wantSpeed:   "",
			wantTemp:    "",
			wantTimeSec: 0,
		},
		{
			name:        `temp "0.0" is cleared`,
			input:       ThermomixStep{Text: "Plate.", TempCelsius: "0.0", TimeSeconds: 0},
			wantSpeed:   "",
			wantTemp:    "",
			wantTimeSec: 0,
		},
		{
			name:        `speed "0" + temp "0" both cleared → manual step timer zeroed`,
			input:       ThermomixStep{Text: "Bake in oven.", Speed: "0", TempCelsius: "0", TimeSeconds: 30},
			wantSpeed:   "",
			wantTemp:    "",
			wantTimeSec: 0, // manual step: all params empty → time must be 0
		},
		{
			name:        `legitimate speed "5" is preserved`,
			input:       ThermomixStep{Text: "Chop onions.", Speed: "5", TimeSeconds: 5},
			wantSpeed:   "5",
			wantTemp:    "",
			wantTimeSec: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			steps := []ThermomixStep{tt.input}
			sanitizeSteps(steps)
			got := steps[0]
			if got.Speed != tt.wantSpeed {
				t.Errorf("Speed = %q, want %q", got.Speed, tt.wantSpeed)
			}
			if got.TempCelsius != tt.wantTemp {
				t.Errorf("TempCelsius = %q, want %q", got.TempCelsius, tt.wantTemp)
			}
			if got.TimeSeconds != tt.wantTimeSec {
				t.Errorf("TimeSeconds = %d, want %d", got.TimeSeconds, tt.wantTimeSec)
			}
		})
	}
}

// TestSanitizeSteps_TTSParamFilter asserts that AI-hallucinated TTS parameter
// strings (e.g. "5 sec", "vitesse 1") in ingredient_refs are dropped and never
// reach Cookidoo as clickable ingredient checkboxes.
func TestSanitizeSteps_TTSParamFilter(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		refs     []string
		wantRefs []string
	}{
		{
			name:     "pure time string dropped",
			text:     "Hachez les oignons. 5 sec / vitesse 5",
			refs:     []string{"5 sec"},
			wantRefs: nil,
		},
		{
			name:     "pure speed string dropped",
			text:     "Faites revenir. 3 min / 120°C / vitesse 1",
			refs:     []string{"vitesse 1"},
			wantRefs: nil,
		},
		{
			name:     "combined TTS notation dropped",
			text:     "Mélangez la sauce. 3 min / 120°C / vitesse 1",
			refs:     []string{"3 min / 120°C / vitesse 1", "3 min", "vitesse 1"},
			wantRefs: nil,
		},
		{
			name:     "Arabic speed label dropped",
			text:     "أضف الماء. 3 min / سرعة 1",
			refs:     []string{"سرعة 1"},
			wantRefs: nil,
		},
		{
			name:     "German Stufe label dropped",
			text:     "Zwiebeln hacken. 5 sec / Stufe 5",
			refs:     []string{"Stufe 5"},
			wantRefs: nil,
		},
		{
			name:     "Spanish vel. label dropped",
			text:     "Picar cebollas. 5 sec / vel. 5",
			refs:     []string{"vel. 5"},
			wantRefs: nil,
		},
		{
			name:     "legitimate ingredient preserved alongside hallucinated ref",
			text:     "Mettre 500 g tomates et faire cuire. 10 min / 100°C / vitesse 1",
			refs:     []string{"500 g tomates", "10 min", "vitesse 1"},
			wantRefs: []string{"500 g tomates"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			steps := []ThermomixStep{{Text: tt.text, Speed: "1", IngredientRefs: tt.refs}}
			sanitizeSteps(steps)
			got := steps[0].IngredientRefs

			if len(got) != len(tt.wantRefs) {
				t.Fatalf("IngredientRefs = %v, want %v", got, tt.wantRefs)
			}
			for i, ref := range got {
				if ref != tt.wantRefs[i] {
					t.Errorf("IngredientRefs[%d] = %q, want %q", i, ref, tt.wantRefs[i])
				}
			}
		})
	}
}

// TestSanitizeSteps_LegitimateIngredientsSurviveFilter asserts that real
// ingredient names whose text happens to contain "min" or "sec" as substrings
// are NOT incorrectly dropped by the TTS hallucination filter.
// These were false positives under the old strings.Contains approach.
func TestSanitizeSteps_LegitimateIngredientsSurviveFilter(t *testing.T) {
	tests := []struct {
		name string
		text string
		ref  string
	}{
		{
			// "cumin" contains "min" — the old filter would have dropped it.
			name: "cumin is not a time marker",
			text: "Ajouter 1 c. à café de cumin.",
			ref:  "1 c. à café de cumin",
		},
		{
			// "sel sec" contains "sec" — the old filter would have dropped it.
			name: "sel sec is not a duration",
			text: "Assaisonner avec du sel sec et du poivre.",
			ref:  "sel sec",
		},
		{
			// "haricots secs" contains "sec" — the old filter would have dropped it.
			name: "haricots secs is not a duration",
			text: "Faire tremper les haricots secs une nuit.",
			ref:  "haricots secs",
		},
		{
			// "émincé" contains "min" — the old filter would have dropped it.
			name: "ail émincé is not a time marker",
			text: "Ajouter 2 gousses d'ail émincé dans le bol.",
			ref:  "ail émincé",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			steps := []ThermomixStep{{Text: tt.text, Speed: "1", TimeSeconds: 5, IngredientRefs: []string{tt.ref}}}
			sanitizeSteps(steps)
			got := steps[0].IngredientRefs
			if len(got) != 1 || got[0] != tt.ref {
				t.Errorf("legitimate ingredient %q was incorrectly dropped; got refs %v", tt.ref, got)
			}
		})
	}
}

// TestSanitizeSteps_DeduplicationFilter asserts that if the AI hallucinates
// and outputs duplicate identical strings in the ingredient_refs array,
// they are cleanly deduplicated by sanitizeSteps to prevent the Cookidoo UI
// from looping over them and creating duplicated text bubbles.
func TestSanitizeSteps_DeduplicationFilter(t *testing.T) {
	text := "Ajouter le boulgour rincé et égoutté dans la casserole."
	refs := []string{
		"le boulgour rincé et égoutté",
		"le boulgour rincé et égoutté", // Duplicate 1
		"le boulgour rincé et égoutté", // Duplicate 2
	}
	wantRefs := []string{"le boulgour rincé et égoutté"}

	steps := []ThermomixStep{{
		Text:           text,
		Speed:          "1",
		IngredientRefs: refs,
	}}

	sanitizeSteps(steps)
	got := steps[0].IngredientRefs

	if len(got) != len(wantRefs) {
		t.Fatalf("IngredientRefs length = %d, want %d (refs: %v)", len(got), len(wantRefs), got)
	}
	if got[0] != wantRefs[0] {
		t.Errorf("IngredientRefs[0] = %q, want %q", got[0], wantRefs[0])
	}
}
