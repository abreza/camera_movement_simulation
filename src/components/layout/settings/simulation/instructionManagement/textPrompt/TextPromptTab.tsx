import React, { FC, useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { useAppDispatch } from "@/redux/hooks";
import { setCinematographyPrompt } from "@/redux/slices/instructionsSlice";
import { toast } from "react-toastify";

export const TextPromptTab: FC = () => {
  const dispatch = useAppDispatch();
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
        toast.error("Error translating text");
        return;
      }

      dispatch(setCinematographyPrompt(data.cinematographyPrompt));
      toast.success("Text translated successfully");
    } catch (err) {
      console.error("Failed to translate text prompt:", err);
      toast.error("Failed to translate text prompt");
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
