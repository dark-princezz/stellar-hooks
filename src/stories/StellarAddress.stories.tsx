/**
 * @file StellarAddress.stories.tsx
 * @description Storybook stories for StellarAddress and StellarIdenticon; also the targets of the visual
 * regression tests (#1201).
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { StellarAddress } from "../components/StellarAddress";
import { StellarIdenticon } from "../components/StellarIdenticon";

const ADDRESS = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";

const meta: Meta<typeof StellarAddress> = {
  title: "Components/StellarAddress",
  component: StellarAddress,
  tags: ["autodocs"],
  args: { address: ADDRESS },
};

export default meta;
type Story = StoryObj<typeof StellarAddress>;

export const Default: Story = {};

export const LongerEnds: Story = { args: { leadingChars: 10, trailingChars: 10 } };

export const Identicons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <StellarIdenticon address={ADDRESS} size={24} />
      <StellarIdenticon address={ADDRESS} size={48} />
      <StellarIdenticon address="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7" size={48} />
    </div>
  ),
};
