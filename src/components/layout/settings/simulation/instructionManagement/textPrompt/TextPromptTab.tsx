import React, { FC, useState } from "react";
import { Box, TextField, Button } from "@mui/material";

interface TextPromptTabProps {
  onTranslate: () => void;
}

export const TextPromptTab: FC<TextPromptTabProps> = ({ onTranslate }) => {
  const [textPrompt, setTextPrompt] = useState("");
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
        onClick={onTranslate}
        disabled={!textPrompt.trim()}
      >
        Translate to Low Level Instructions
      </Button>
    </Box>
  );
};
