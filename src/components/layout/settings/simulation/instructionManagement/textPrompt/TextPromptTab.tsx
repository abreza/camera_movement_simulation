import React, { FC, useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { CinematographyPrompt } from "@/service/simulation/instruction/types";

interface TextPromptTabProps {
  onTranslateSuccess: (cinematographyPrompt: CinematographyPrompt) => void;
}

export const TextPromptTab: FC<TextPromptTabProps> = ({
  onTranslateSuccess,
}) => {
  const [textPrompt, setTextPrompt] = useState("");

  const handleTranslate = async () => {
    if (!textPrompt.trim()) return;

    try {
      const response = await fetch(
        "/api/translate-text-cinematography-instruction",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: textPrompt }),
        }
      );

      if (!response.ok) {
        throw new Error("Translation request failed.");
      }

      const data = await response.json();

      if (data.error) {
        console.error("Error in OpenAI response:", data.error);
        return;
      }

      onTranslateSuccess(data.cinematographyPrompt);
    } catch (err) {
      console.error("Failed to translate text prompt:", err);
    }
  };

  return (
    <Box>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={textPrompt}
        onChange={(e) => setTextPrompt(e.target.value)}
        placeholder="Enter cinematography text prompt..."
        sx={{ mb: 2 }}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleTranslate}
        disabled={!textPrompt.trim()}
      >
        Translate to High-Level Instructions
      </Button>
    </Box>
  );
};
