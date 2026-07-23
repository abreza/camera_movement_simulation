import React, { FC, useState } from "react";
import { Box, TextField, Button, Typography, alpha, CircularProgress } from "@mui/material";
import { AutoAwesome as TranslateIcon } from "@mui/icons-material";
import { useAppDispatch } from "@/redux/hooks";
import { setCinematographyPrompt } from "@/redux/slices/instructionsSlice";
import { toast } from "react-toastify";

export const TextPromptTab: FC = () => {
  const dispatch = useAppDispatch();
  const [textPrompt, setTextPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTranslate = async () => {
    if (!textPrompt.trim()) return;

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", mb: 1.5, display: "block" }}>
        Describe the camera movement in natural language. AI will convert it to structured cinematography instructions.
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={textPrompt}
        onChange={(e) => setTextPrompt(e.target.value)}
        placeholder="e.g., Start with a low-angle close-up from the front, then slowly dolly out to a wide shot while panning left..."
        sx={{
          mb: 2,
          "& .MuiOutlinedInput-root": {
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.825rem",
            lineHeight: 1.6,
          },
        }}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleTranslate}
        disabled={!textPrompt.trim() || isLoading}
        startIcon={
          isLoading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <TranslateIcon />
          )
        }
      >
        {isLoading ? "Translating..." : "Translate to Instructions"}
      </Button>
    </Box>
  );
};
