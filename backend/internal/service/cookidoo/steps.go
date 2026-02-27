package cookidoo

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

// NewStepItem builds a RecipeItem for an instruction step.
//
// When speed is non-empty, it appends the compact TTS notation to the text
// and adds a TTS annotation so Cookidoo renders the Thermomix parameters
// as interactive tags.
//
// ingredientRefs are ingredient descriptions (e.g. "500 g tomates") that must
// appear verbatim in text. Each one gets an INGREDIENT annotation pointing to
// its exact position, so Cookidoo can link the step back to the ingredient list.
//
// lang is the BCP-47 language code of the recipe (e.g. "fr", "de", "en").
func NewStepItem(text, speed string, timeSecs int, tempCelsius, lang string, ingredientRefs []string) RecipeItem {
	var annotations []StepAnnotation

	// Build INGREDIENT annotations — search for each ref verbatim in text.
	for _, ref := range ingredientRefs {
		if ref == "" {
			continue
		}
		offset, ok := runeIndex(text, ref)
		if !ok {
			continue // ref not found verbatim; skip rather than emit wrong offset
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

	// Build TTS annotation when there is a machine action.
	fullText := text
	if speed != "" {
		notation := buildTTSNotation(speed, timeSecs, tempCelsius, lang)
		fullText = text + " " + notation
		offset := utf8.RuneCountInString(text) + 1 // +1 for the space separator
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

// runeIndex returns the rune-based offset of substr within s, and true if found.
func runeIndex(s, substr string) (int, bool) {
	byteIdx := strings.Index(s, substr)
	if byteIdx < 0 {
		return 0, false
	}
	return utf8.RuneCountInString(s[:byteIdx]), true
}

// buildTTSNotation formats the compact Thermomix notation string.
// Examples: "5 sec/vitesse 5", "3 min/120°C/vitesse 1", "1 min/speed 10"
func buildTTSNotation(speed string, timeSecs int, tempCelsius, lang string) string {
	label := speedLabelForLang(lang)
	var parts []string

	if timeSecs > 0 {
		if timeSecs < 60 {
			parts = append(parts, fmt.Sprintf("%d sec", timeSecs))
		} else {
			parts = append(parts, fmt.Sprintf("%d min", timeSecs/60))
		}
	}
	if tempCelsius != "" {
		parts = append(parts, tempCelsius+"°C")
	}
	parts = append(parts, label+" "+speed)

	return strings.Join(parts, "/")
}

// speedLabelForLang returns the lowercase speed label for a BCP-47 language code.
func speedLabelForLang(lang string) string {
	switch strings.ToLower(lang) {
	case "fr", "fr-fr":
		return "vitesse"
	case "de", "de-de":
		return "stufe"
	case "es", "es-es", "it", "it-it", "pt", "pt-pt", "pt-br":
		return "vel."
	default:
		return "speed"
	}
}
