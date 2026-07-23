import { createTheme, alpha } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    accent: Palette["primary"];
    surface: {
      main: string;
      light: string;
      dark: string;
    };
  }
  interface PaletteOptions {
    accent?: PaletteOptions["primary"];
    surface?: {
      main: string;
      light: string;
      dark: string;
    };
  }
}

const BRAND_ORANGE = "#E8753A";
const BRAND_BLUE = "#4EA8DE";
const SURFACE_DARK = "#1A1A2E";
const SURFACE_MAIN = "#222240";
const SURFACE_LIGHT = "#2A2A4A";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: BRAND_ORANGE,
      light: "#F09060",
      dark: "#C05E28",
    },
    secondary: {
      main: BRAND_BLUE,
      light: "#7EC8F0",
      dark: "#3080B0",
    },
    background: {
      default: "#0F0F1A",
      paper: SURFACE_MAIN,
    },
    surface: {
      main: SURFACE_MAIN,
      light: SURFACE_LIGHT,
      dark: SURFACE_DARK,
    },
    text: {
      primary: "#E8E8F0",
      secondary: "#9898B8",
    },
    divider: alpha("#FFFFFF", 0.08),
    error: {
      main: "#FF6B6B",
    },
    warning: {
      main: "#FFB347",
    },
    success: {
      main: "#6BCB77",
    },
    info: {
      main: BRAND_BLUE,
    },
  },
  typography: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
      fontSize: "1.05rem",
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: "0.9rem",
      letterSpacing: "0.01em",
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: "0.8rem",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "#9898B8",
    },
    body2: {
      fontSize: "0.825rem",
      lineHeight: 1.6,
    },
    caption: {
      fontSize: "0.72rem",
      letterSpacing: "0.03em",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "@import":
          "url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap')",
        body: {
          background: `linear-gradient(145deg, #0F0F1A 0%, #161628 50%, #0F0F1A 100%)`,
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha("#FFFFFF", 0.15)} transparent`,
          "&::-webkit-scrollbar": {
            width: 6,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha("#FFFFFF", 0.15),
            borderRadius: 3,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: SURFACE_DARK,
          border: `1px solid ${alpha("#FFFFFF", 0.06)}`,
          boxShadow: `0 24px 80px ${alpha("#000000", 0.6)}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: "1.1rem",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          padding: "20px 24px 12px",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "12px 24px 24px",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 20px",
          fontSize: "0.8rem",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: `0 4px 20px ${alpha(BRAND_ORANGE, 0.35)}`,
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderColor: alpha("#FFFFFF", 0.12),
          "&:hover": {
            borderColor: alpha("#FFFFFF", 0.25),
            backgroundColor: alpha("#FFFFFF", 0.04),
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: alpha("#FFFFFF", 0.1),
          color: "#9898B8",
          fontSize: "0.75rem",
          fontWeight: 600,
          transition: "all 0.2s ease",
          "&.Mui-selected": {
            backgroundColor: alpha(BRAND_ORANGE, 0.15),
            color: BRAND_ORANGE,
            borderColor: alpha(BRAND_ORANGE, 0.4),
            "&:hover": {
              backgroundColor: alpha(BRAND_ORANGE, 0.25),
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            fontSize: "0.825rem",
            backgroundColor: alpha("#000000", 0.2),
            borderRadius: 8,
            "& fieldset": {
              borderColor: alpha("#FFFFFF", 0.08),
            },
            "&:hover fieldset": {
              borderColor: alpha("#FFFFFF", 0.15),
            },
            "&.Mui-focused fieldset": {
              borderColor: BRAND_ORANGE,
              borderWidth: 1.5,
            },
          },
          "& .MuiInputLabel-root": {
            fontSize: "0.8rem",
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontSize: "0.825rem",
          backgroundColor: alpha("#000000", 0.2),
          borderRadius: 8,
          "& fieldset": {
            borderColor: alpha("#FFFFFF", 0.08),
          },
          "&:hover fieldset": {
            borderColor: alpha("#FFFFFF", 0.15),
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
          "& .MuiSlider-thumb": {
            width: 14,
            height: 14,
            transition: "all 0.15s ease",
            "&:hover, &.Mui-active": {
              boxShadow: `0 0 0 8px ${alpha(BRAND_ORANGE, 0.2)}`,
            },
          },
          "& .MuiSlider-track": {
            border: "none",
          },
          "& .MuiSlider-rail": {
            opacity: 0.2,
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: alpha("#000000", 0.15),
          border: `1px solid ${alpha("#FFFFFF", 0.06)}`,
          borderRadius: "8px !important",
          "&:before": { display: "none" },
          "&.Mui-expanded": {
            margin: 0,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 44,
          "&.Mui-expanded": {
            minHeight: 44,
          },
        },
        content: {
          margin: "8px 0",
          "&.Mui-expanded": {
            margin: "8px 0",
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          "& .MuiStepIcon-root": {
            color: alpha("#FFFFFF", 0.12),
            "&.Mui-active": {
              color: BRAND_ORANGE,
            },
            "&.Mui-completed": {
              color: "#6BCB77",
            },
          },
          "& .MuiStepLabel-label": {
            fontSize: "0.75rem",
            fontWeight: 600,
          },
          "& .MuiStepConnector-line": {
            borderColor: alpha("#FFFFFF", 0.08),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.7rem",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: "0.75rem",
          fontWeight: 600,
          minHeight: 40,
          textTransform: "none",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2.5,
          borderRadius: 2,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: alpha("#000000", 0.2),
          border: `1px solid ${alpha("#FFFFFF", 0.06)}`,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: "0.8rem",
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          backgroundColor: SURFACE_MAIN,
          border: `1px solid ${alpha("#FFFFFF", 0.1)}`,
          boxShadow: `0 8px 32px ${alpha("#000000", 0.4)}`,
          "&:hover": {
            backgroundColor: SURFACE_LIGHT,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
          backgroundColor: alpha("#FFFFFF", 0.06),
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4,
          "&:hover": {
            backgroundColor: alpha("#FFFFFF", 0.04),
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          "& .MuiSwitch-switchBase.Mui-checked": {
            color: BRAND_ORANGE,
            "& + .MuiSwitch-track": {
              backgroundColor: alpha(BRAND_ORANGE, 0.5),
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontSize: "0.825rem",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.825rem",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.8rem",
        },
      },
    },
  },
});

export default theme;
