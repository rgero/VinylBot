import "dotenv/config";

import { Client, GatewayIntentBits } from "discord.js";

import { ProcessAdd } from "./discord/ProcessAdd.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  const targetMessage = message.content;
  if (targetMessage.toLocaleLowerCase().startsWith("!add "))
  {
    ProcessAdd(message);
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
