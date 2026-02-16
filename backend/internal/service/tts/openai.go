package tts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const (
	apiURL       = "https://api.openai.com/v1/audio/speech"
	defaultModel = "tts-1"
	DefaultVoice = "nova"
	MaxInputLen  = 4096
)

// ValidVoices is the set of voices supported by OpenAI TTS.
var ValidVoices = map[string]bool{
	"alloy":   true,
	"echo":    true,
	"fable":   true,
	"onyx":    true,
	"nova":    true,
	"shimmer": true,
}

// Client calls the OpenAI TTS API.
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a TTS client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

type speechRequest struct {
	Model          string `json:"model"`
	Input          string `json:"input"`
	Voice          string `json:"voice"`
	ResponseFormat string `json:"response_format"`
}

// Synthesize converts text to speech and returns raw MP3 bytes.
func (c *Client) Synthesize(ctx context.Context, text, voice string) ([]byte, error) {
	if voice == "" {
		voice = DefaultVoice
	}

	// Truncate if over limit
	if len(text) > MaxInputLen {
		text = text[:MaxInputLen]
	}

	body, err := json.Marshal(speechRequest{
		Model:          defaultModel,
		Input:          text,
		Voice:          voice,
		ResponseFormat: "mp3",
	})
	if err != nil {
		return nil, fmt.Errorf("tts: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("tts: create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tts: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("tts: OpenAI returned %d: %s", resp.StatusCode, string(errBody))
	}

	audio, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("tts: read response: %w", err)
	}

	return audio, nil
}
