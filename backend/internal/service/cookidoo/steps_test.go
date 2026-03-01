package cookidoo

import (
	"testing"
)

func TestBuildTTSNotation(t *testing.T) {
	tests := []struct {
		name        string
		speed       string
		timeSecs    int
		tempCelsius string
		lang        string
		want        string
	}{
		{
			name:        "English, no time, no temp",
			speed:       "5",
			timeSecs:    0,
			tempCelsius: "",
			lang:        "en",
			want:        "speed 5",
		},
		{
			name:        "French, full parameters",
			speed:       "1",
			timeSecs:    180,
			tempCelsius: "120",
			lang:        "fr",
			want:        "3 min / 120°C / vitesse 1",
		},
		{
			name:        "German, seconds only, with temp",
			speed:       "2",
			timeSecs:    45,
			tempCelsius: "100",
			lang:        "de",
			want:        "45 sec / 100°C / Stufe 2",
		},
		{
			name:        "Arabic, full parameters with LTR Embedding",
			speed:       "1",
			timeSecs:    180, // 3 min
			tempCelsius: "120",
			lang:        "ar",
			// Arabic wraps the standard LTR string in LRE and PDF markers
			want: "\u202A3 min / 120°C / سرعة 1\u202C",
		},
		{
			name:        "Arabic, speed only with LTR Embedding",
			speed:       "5",
			timeSecs:    0,
			tempCelsius: "",
			lang:        "ar",
			want:        "\u202Aسرعة 5\u202C",
		},
		{
			name:        "Mixed mins and secs",
			speed:       "3",
			timeSecs:    90, // 1 min 30 sec
			tempCelsius: "",
			lang:        "en",
			want:        "1 min 30 sec / speed 3",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildTTSNotation(tt.speed, tt.timeSecs, tt.tempCelsius, tt.lang); got != tt.want {
				t.Errorf("buildTTSNotation() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestBuildModeNotation(t *testing.T) {
	tests := []struct {
		name        string
		mode        string
		timeSecs    int
		tempCelsius string
		lang        string
		want        string
	}{
		{
			name:        "Dough French",
			mode:        "dough",
			timeSecs:    120, // 2 min
			tempCelsius: "",
			lang:        "fr",
			want:        "Pétrin / 2 min",
		},
		{
			name:        "Turbo Arabic with LTR Embedding",
			mode:        "turbo",
			timeSecs:    2,
			tempCelsius: "",
			lang:        "ar",
			want:        "\u202ATurbo / 2 sec\u202C",
		},
		{
			name:        "Warm Up English with temp",
			mode:        "warm_up",
			timeSecs:    0,
			tempCelsius: "65",
			lang:        "en",
			want:        "Warm up / 65°C",
		},
		{
			name:        "Warm Up French with time and custom temp",
			mode:        "warm_up",
			timeSecs:    300, // 5 min
			tempCelsius: "70",
			lang:        "fr",
			want:        "Réchauffer / 5 min / 70°C",
		},
		{
			name:        "Unknown mode",
			mode:        "invalid_mode",
			timeSecs:    60,
			tempCelsius: "",
			lang:        "en",
			want:        "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildModeNotation(tt.mode, tt.timeSecs, tt.tempCelsius, tt.lang); got != tt.want {
				t.Errorf("buildModeNotation() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNewStepItem(t *testing.T) {
	t.Run("Standard TTS Step with Ingredient Ref", func(t *testing.T) {
		text := "Mettre l'oignon dans le bol."
		speed := "5"
		mode := ""
		timeSecs := 5
		temp := ""
		lang := "fr"
		refs := []string{"1 oignon"} // "1 oignon" is not in the text, test that it handles missing safely

		refsValid := []string{"oignon"}

		itemFalse := NewStepItem(text, speed, mode, timeSecs, temp, lang, refs)
		if len(itemFalse.Annotations) != 1 { // Should only have TTS if ref not found
			t.Errorf("expected 1 annotation (TTS), got %d", len(itemFalse.Annotations))
		}

		itemTrue := NewStepItem(text, speed, mode, timeSecs, temp, lang, refsValid)
		if len(itemTrue.Annotations) != 2 {
			t.Errorf("expected 2 annotations (INGREDIENT + TTS), got %d", len(itemTrue.Annotations))
		}

		ingAnn := itemTrue.Annotations[0]
		if ingAnn.Type != "INGREDIENT" || ingAnn.Data.Description != "oignon" {
			t.Errorf("invalid INGREDIENT annotation: %+v", ingAnn)
		}

		ttsAnn := itemTrue.Annotations[1]
		if ttsAnn.Type != "TTS" || ttsAnn.Data.Speed != "5" || ttsAnn.Data.Time != 5 {
			t.Errorf("invalid TTS annotation: %+v", ttsAnn)
		}
	})

	t.Run("Mode Step Auto Overrides", func(t *testing.T) {
		text := "Pétrir la pâte."
		mode := "dough"
		lang := "en"
		// The prompt instructs the Go backend wrapper to ignore speed, but let's test NewStepItem's pure output
		item := NewStepItem(text, "", mode, 120, "", lang, nil)

		if len(item.Annotations) != 1 {
			t.Fatalf("expected 1 annotation (MODE), got %d", len(item.Annotations))
		}

		ann := item.Annotations[0]
		if ann.Type != "MODE" || ann.Name != "dough" {
			t.Errorf("expected MODE dough annotation, got Type=%s Name=%s", ann.Type, ann.Name)
		}

		if ann.Data.Time != 120 {
			t.Errorf("expected mode time 120, got %v", ann.Data.Time)
		}
	})

	t.Run("Mode wins when speed is also passed", func(t *testing.T) {
		// NewStepItem must use the MODE branch and ignore the speed argument
		// when mode is non-empty. This mirrors the Go post-generation validator
		// in thermomix.go which strips speed before calling NewStepItem.
		item := NewStepItem("Pétrir la pâte.", "5", "dough", 120, "", "fr", nil)
		if len(item.Annotations) != 1 {
			t.Fatalf("expected 1 annotation (MODE), got %d", len(item.Annotations))
		}
		if ann := item.Annotations[0]; ann.Type != "MODE" || ann.Name != "dough" {
			t.Errorf("expected MODE/dough annotation, got Type=%s Name=%s", ann.Type, ann.Name)
		}
	})

	t.Run("Duplicate ingredient refs produce duplicate annotations", func(t *testing.T) {
		// Passing the same ref twice currently creates two INGREDIENT annotations
		// at the same rune offset. This test documents the existing behaviour so
		// any future deduplication change is an explicit, visible decision.
		text := "Ajouter l'oignon et faire revenir l'oignon."
		item := NewStepItem(text, "1", "", 180, "120", "fr", []string{"oignon", "oignon"})
		ingCount := 0
		for _, ann := range item.Annotations {
			if ann.Type == "INGREDIENT" {
				ingCount++
			}
		}
		if ingCount != 2 {
			t.Errorf("expected 2 INGREDIENT annotations for duplicate refs, got %d", ingCount)
		}
	})

	t.Run("Warm Up Default Temp", func(t *testing.T) {
		data := modeAnnotationData("warm_up", 0, "")
		if data.Temperature == nil || data.Temperature.Value != "65" {
			t.Errorf("warm_up should default to 65C, got %+v", data.Temperature)
		}

		dataCustom := modeAnnotationData("warm_up", 0, "70")
		if dataCustom.Temperature == nil || dataCustom.Temperature.Value != "70" {
			t.Errorf("warm_up should respect custom temp 70C, got %+v", dataCustom.Temperature)
		}
	})
}

func TestSpeedLabelForLang(t *testing.T) {
	tests := []struct {
		lang string
		want string
	}{
		// Exact base codes still work.
		{"fr", "vitesse"},
		{"de", "Stufe"},
		{"ar", "سرعة"},
		{"en", "speed"},
		// Regional variants that were broken before prefix matching.
		{"fr-CA", "vitesse"},
		{"fr-LU", "vitesse"},
		{"de-LU", "Stufe"},
		{"de-AT", "Stufe"},
		{"ar-IQ", "سرعة"},
		{"ar-LB", "سرعة"},
		{"es-MX", "vel."},
		{"it-CH", "vel."},
		{"pt-BR", "vel."},
		{"nl-BE", "stand"},
		{"zh-TW", "速度"},
		{"ja-JP", "速度"},
		// Unknown language falls back to English.
		{"en-US", "speed"},
		{"ko", "speed"},
	}
	for _, tt := range tests {
		t.Run(tt.lang, func(t *testing.T) {
			if got := speedLabelForLang(tt.lang); got != tt.want {
				t.Errorf("speedLabelForLang(%q) = %q, want %q", tt.lang, got, tt.want)
			}
		})
	}
}

func TestRuneIndex(t *testing.T) {
	tests := []struct {
		s      string
		substr string
		want   int
		ok     bool
	}{
		{"Hello world", "world", 6, true},
		{"Hello world", "Hello", 0, true}, // match at position 0
		{"Hello world", "foo", 0, false},
		{"", "x", 0, false},                                                      // empty string
		{"أضف 2 ملعقة كبيرة", "2 ملعقة", 4, true}, // testing arabic multi-byte boundary
		{"Mélangez la purée", "purée", 12, true},   // testing french accent boundary
	}

	for _, tt := range tests {
		got, ok := runeIndex(tt.s, tt.substr)
		if ok != tt.ok || got != tt.want {
			t.Errorf("runeIndex(%q, %q) = %v, %v; want %v, %v", tt.s, tt.substr, got, ok, tt.want, tt.ok)
		}
	}
}
