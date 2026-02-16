package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/service/tts"
)

// TTSHandler handles text-to-speech proxy requests.
type TTSHandler struct {
	client *tts.Client
}

// NewTTSHandler creates a new TTS handler. Pass empty apiKey to disable.
func NewTTSHandler(apiKey string) *TTSHandler {
	var client *tts.Client
	if apiKey != "" {
		client = tts.NewClient(apiKey)
	}
	return &TTSHandler{client: client}
}

type synthesizeRequest struct {
	Text  string `json:"text"`
	Voice string `json:"voice"`
}

// Synthesize handles POST /api/v1/tts/synthesize
func (h *TTSHandler) Synthesize(w http.ResponseWriter, r *http.Request) {
	if h.client == nil {
		response.ServiceUnavailable(w, "TTS")
		return
	}

	var req synthesizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	req.Text = strings.TrimSpace(req.Text)
	if req.Text == "" {
		response.BadRequest(w, "text is required")
		return
	}
	if len(req.Text) > tts.MaxInputLen {
		response.BadRequest(w, "text exceeds maximum length of 4096 characters")
		return
	}

	if req.Voice == "" {
		req.Voice = tts.DefaultVoice
	}
	if !tts.ValidVoices[req.Voice] {
		response.BadRequest(w, "invalid voice; must be one of: alloy, echo, fable, onyx, nova, shimmer")
		return
	}

	audio, err := h.client.Synthesize(r.Context(), req.Text, req.Voice)
	if err != nil {
		response.InternalError(w, err)
		return
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Content-Length", strconv.Itoa(len(audio)))
	w.WriteHeader(http.StatusOK)
	w.Write(audio)
}
