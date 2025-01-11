import React, { FC } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { getEnumLabel } from "./enumLabels";

interface SelectRendererProps {
  options: string[];
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
  haveEmptyOption?: boolean;
  enumType: string;
  size?: "small" | "medium";
  sx?: Record<string, any>;
}

export const SelectRenderer: FC<SelectRendererProps> = ({
  options,
  value = "",
  onChange,
  haveEmptyOption = false,
  enumType,
  size = "small",
  sx = {},
}) => {
  return (
    <FormControl size={size} sx={{ mx: 1, ...sx }}>
      <Select
        value={value}
        onChange={onChange}
        displayEmpty
        variant="standard"
        sx={{
          "& .MuiSelect-select": {
            fontSize: "10px",
            fontWeight: "bold",
          },
        }}
      >
        {haveEmptyOption && (
          <MenuItem value="" sx={{ fontSize: "inherit", fontWeight: "normal" }}>
            -
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem
            key={option}
            value={option}
            sx={{ fontSize: "inherit", fontWeight: "normal" }}
          >
            {getEnumLabel(option, enumType)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
