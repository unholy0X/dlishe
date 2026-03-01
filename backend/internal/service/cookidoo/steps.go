package cookidoo

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

// NewStepItem builds a RecipeItem for an instruction step.
//
// When mode is one of the official Cookidoo automodes ("dough", "turbo", "blend",
// "warm_up", "rice_cooker"), a MODE annotation is created and the mode's fixed
// internal speed is applied automatically — the caller's speed value is ignored.
//
// When mode is empty and speed is non-empty, a standard TTS annotation is created
// with the provided speed / time / temperature parameters.
//
// ingredientRefs are ingredient descriptions (e.g. "500 g tomates") that must
// appear verbatim in text. Each gets an INGREDIENT annotation at its exact position.
//
// lang is the BCP-47 language code (e.g. "fr", "ar", "en") used for localised labels.
func NewStepItem(text, speed, mode string, timeSecs int, tempCelsius, lang string, ingredientRefs []string) RecipeItem {
	var annotations []StepAnnotation

	// Build INGREDIENT annotations — locate each ref verbatim in text.
	for _, ref := range ingredientRefs {
		if ref == "" {
			continue
		}
		offset, ok := runeIndex(text, ref)
		if !ok {
			continue
		}
		length := utf8.RuneCountInString(ref)
		annotations = append(annotations, StepAnnotation{
			Type: "INGREDIENT",
			Data: AnnotationData{Description: ref},
			Position: AnnotationPosition{
				Offset: offset,
				Length: length,
			},
		})
	}

	fullText := text

	if mode != "" {
		// ── MODE annotation ───────────────────────────────────────────
		notation := buildModeNotation(mode, timeSecs, tempCelsius, lang)
		if notation != "" {
			fullText = text + " " + notation
			offset := utf8.RuneCountInString(text) + 1
			length := utf8.RuneCountInString(notation)

			ann := StepAnnotation{
				Type: "MODE",
				Name: mode,
				Data: modeAnnotationData(mode, timeSecs, tempCelsius),
				Position: AnnotationPosition{
					Offset: offset,
					Length: length,
				},
			}
			annotations = append(annotations, ann)
		}

	} else if speed != "" {
		// ── TTS annotation ────────────────────────────────────────────
		notation := buildTTSNotation(speed, timeSecs, tempCelsius, lang)
		fullText = text + " " + notation
		offset := utf8.RuneCountInString(text) + 1
		length := utf8.RuneCountInString(notation)

		ann := StepAnnotation{
			Type: "TTS",
			Data: AnnotationData{
				Speed: speed,
				Time:  timeSecs,
			},
			Position: AnnotationPosition{Offset: offset, Length: length},
		}
		if tempCelsius != "" {
			ann.Data.Temperature = &AnnotationTemp{Value: tempCelsius, Unit: "C"}
		}
		annotations = append(annotations, ann)
	}

	return RecipeItem{
		Type:        "STEP",
		Text:        fullText,
		Annotations: annotations,
	}
}

// modeAnnotationData returns the AnnotationData for a MODE annotation.
// Each automode has fixed internal parameters; only time is variable.
func modeAnnotationData(mode string, timeSecs int, tempCelsius string) AnnotationData {
	data := AnnotationData{}
	if timeSecs > 0 {
		data.Time = timeSecs
	}
	switch mode {
	case "blend":
		data.Speed = "6"
	case "warm_up":
		data.Speed = "soft"
		temp := tempCelsius
		if temp == "" {
			temp = "65"
		}
		data.Temperature = &AnnotationTemp{Value: temp, Unit: "C"}
	case "rice_cooker":
		data.Temperature = &AnnotationTemp{Value: "100", Unit: "C"}
	}
	return data
}

// buildModeNotation formats the notation appended to the step text for MODE steps.
// Format: "Pétrin /2 min", "Turbo /2 sec", "Mixage /1 min 30 sec", "Réchauffer /65°C"
// Returns "" for unrecognised modes so the caller can omit the notation entirely.
func buildModeNotation(mode string, timeSecs int, tempCelsius, lang string) string {
	label := modeLabelForLang(mode, lang)
	if label == "" {
		return "" // unknown mode — do not emit a notation
	}

	var params []string
	if timeSecs > 0 {
		mins := timeSecs / 60
		secs := timeSecs % 60
		switch {
		case mins > 0 && secs > 0:
			params = append(params, fmt.Sprintf("%d min %d sec", mins, secs))
		case mins > 0:
			params = append(params, fmt.Sprintf("%d min", mins))
		default:
			params = append(params, fmt.Sprintf("%d sec", timeSecs))
		}
	}
	if tempCelsius != "" {
		params = append(params, tempCelsius+"°C")
	}

	if len(params) == 0 {
		return label
	}

	delimiter := " / "
	if strings.HasPrefix(strings.ToLower(lang), "ar") {
		// In Mode permutations there's usually just Time and Temp
		// Let's reverse them for Arabic RTL compliance just like TTS
		for i, j := 0, len(params)-1; i < j; i, j = i+1, j-1 {
			params[i], params[j] = params[j], params[i]
		}
	}
	return label + " / " + strings.Join(params, delimiter)
}

// buildTTSNotation formats the compact Thermomix notation string for TTS steps.
// Examples: "5 sec/vitesse 5", "3 min/120°C/vitesse 1"
func buildTTSNotation(speed string, timeSecs int, tempCelsius, lang string) string {
	var parts []string

	if timeSecs > 0 {
		mins := timeSecs / 60
		secs := timeSecs % 60
		switch {
		case mins > 0 && secs > 0:
			parts = append(parts, fmt.Sprintf("%d min %d sec", mins, secs))
		case mins > 0:
			parts = append(parts, fmt.Sprintf("%d min", mins))
		default:
			parts = append(parts, fmt.Sprintf("%d sec", timeSecs))
		}
	}
	if tempCelsius != "" {
		parts = append(parts, tempCelsius+"°C")
	}
	parts = append(parts, speedLabelForLang(lang)+" "+speed)

	// In Arabic (RTL), standard forward slashes with no padding get inverted or
	// squished against the RTL text by the browser/app rendering engine.
	// Using spaces around the slash ensures consistent visual separation.
	delimiter := " / "
	if strings.HasPrefix(strings.ToLower(lang), "ar") {
		// For Arabic, reverse the order of parts so they render correctly RTL:
		// [Speed] / [Temp] / [Time]
		for i, j := 0, len(parts)-1; i < j; i, j = i+1, j-1 {
			parts[i], parts[j] = parts[j], parts[i]
		}
	}

	return strings.Join(parts, delimiter)
}

// modeLabelForLang returns the localised display label for a Cookidoo automode.
func modeLabelForLang(mode, lang string) string {
	l := strings.ToLower(lang)
	isFR := strings.HasPrefix(l, "fr")
	isDE := strings.HasPrefix(l, "de")
	isES := strings.HasPrefix(l, "es")
	isIT := strings.HasPrefix(l, "it")
	isPT := strings.HasPrefix(l, "pt")
	isNL := strings.HasPrefix(l, "nl")
	isAR := strings.HasPrefix(l, "ar")

	switch mode {
	case "dough":
		switch {
		case isFR:
			return "Pétrin"
		case isDE:
			return "Teigkneten"
		case isES:
			return "Amasar"
		case isIT:
			return "Impasto"
		case isPT:
			return "Amassar"
		case isNL:
			return "Kneden"
		case isAR:
			return "عجن"
		default:
			return "Knead"
		}
	case "turbo":
		return "Turbo" // universal across all Cookidoo locales
	case "blend":
		switch {
		case isFR:
			return "Mixage"
		case isDE:
			return "Mixen"
		case isES:
			return "Mezclar"
		case isIT:
			return "Frullare"
		case isPT:
			return "Misturar"
		case isNL:
			return "Mixen"
		case isAR:
			return "مزج"
		default:
			return "Blend"
		}
	case "warm_up":
		switch {
		case isFR:
			return "Réchauffer"
		case isDE:
			return "Aufwärmen"
		case isES:
			return "Calentar"
		case isIT:
			return "Riscaldare"
		case isPT:
			return "Aquecer"
		case isNL:
			return "Opwarmen"
		case isAR:
			return "تسخين"
		default:
			return "Warm up"
		}
	case "rice_cooker":
		switch {
		case isFR:
			return "Cuiseur à riz"
		case isDE:
			return "Reiskocher"
		case isES:
			return "Arrocera"
		case isIT:
			return "Cuociriso"
		case isPT:
			return "Panela de arroz"
		case isNL:
			return "Rijstkoker"
		case isAR:
			return "طنجرة الأرز"
		default:
			return "Rice cooker"
		}
	default:
		return "" // unknown mode — omit notation to prevent malformed step text
	}
}

// speedLabelForLang returns the localised speed label for TTS notation.
func speedLabelForLang(lang string) string {
	switch strings.ToLower(lang) {
	case "fr", "fr-fr", "fr-be", "fr-ch":
		return "vitesse"
	case "de", "de-de", "de-at", "de-ch":
		return "Stufe"
	case "es", "es-es", "es-mx", "es-ar":
		return "vel."
	case "it", "it-it":
		return "vel."
	case "pt", "pt-pt", "pt-br":
		return "vel."
	case "nl", "nl-nl", "nl-be":
		return "stand"
	case "ar", "ar-sa", "ar-ma", "ar-dz", "ar-eg":
		return "سرعة"
	case "zh", "zh-cn", "zh-tw":
		return "速度"
	case "ja", "ja-jp":
		return "速度"
	default:
		return "speed"
	}
}

// runeIndex returns the rune-based offset of substr within s, and true if found.
func runeIndex(s, substr string) (int, bool) {
	byteIdx := strings.Index(s, substr)
	if byteIdx < 0 {
		return 0, false
	}
	return utf8.RuneCountInString(s[:byteIdx]), true
}
