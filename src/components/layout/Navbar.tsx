"use client";

import React from "react";
import { AppBar, Toolbar, IconButton, Typography } from "@mui/material";
import { Menu } from "@mui/icons-material";

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => (
  <AppBar position="fixed">
    <Toolbar>
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={toggleSidebar}
      >
        <Menu />
      </IconButton>
      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
        Camera Movement Simulation
      </Typography>
    </Toolbar>
  </AppBar>
);

export default Navbar;
