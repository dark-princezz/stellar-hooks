import React from "react";
import type { Preview } from "@storybook/react";
import { StellarProvider } from "../src/context";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => (
      <StellarProvider network="testnet">
        <div style={{ padding: "1.5rem", fontFamily: "sans-serif", maxWidth: 640 }}>
          <Story />
        </div>
      </StellarProvider>
    ),
  ],
};

export default preview;
