/**
 * @file WalletButton.stories.tsx
 * @description Storybook story for the WalletButton component in its disconnected state; also a visual
 * regression target (#1201).
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { WalletButton } from "../components/WalletButton";

const meta: Meta<typeof WalletButton> = {
  title: "Components/WalletButton",
  component: WalletButton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WalletButton>;

export const Disconnected: Story = {};

export const CustomLabels: Story = { args: { connectLabel: "Link wallet", disconnectLabel: "Unlink" } };
