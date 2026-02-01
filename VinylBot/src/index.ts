import "dotenv/config";

import { Client, GatewayIntentBits, Message } from "discord.js";

import { ProcessAdd } from "./discord/ProcessAdd.js";
import { ProcessCheckExists } from "./discord/ProcessCheckExists.js";
import { ProcessInfo } from "./discord/ProcessInfo.js";
import { ProcessList } from "./discord/ProcessList.js";
import { ProcessPlay } from "./discord/ProcessPlay.js";
import { ProcessPlayCount } from "./discord/ProcessPlayCount.js";
import { ProcessRandomAlbum } from "./discord/ProcessRandomAlbum.js";
import { ProcessRandomStore } from "./discord/ProcessRandomStore.js";
import { ProcessTop } from "./discord/ProcessTop.js";
import { ProcessTopLocation } from "./discord/ProcessTopLocation.js";
import { ProcessWant } from "./discord/ProcessWant.js";

const client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const targetMessage = message.content.toLocaleLowerCase();
  if (targetMessage.startsWith("!want "))
  {
    return await ProcessWant(message);
  }

  if (targetMessage.startsWith("!play "))
  {
    return await ProcessPlay(message);
  }

  if (targetMessage.startsWith("!random")) {
    const args = message.content.split(" ").slice(1);
    const param = args[0]?.toLowerCase();
    if (param === "store")
    {
      ProcessRandomStore(message);
    } else {
      ProcessRandomAlbum(message);
    }
    return;
  }

  if(targetMessage.startsWith("!wantlist"))
  {
    return await ProcessList(message, 'want');
  }

  if(targetMessage.startsWith("!have"))
  {
    return await ProcessList(message, 'have');
  }

  if(targetMessage.startsWith("!add"))
  {
    return await ProcessAdd(message)
  }
  
  if (targetMessage.startsWith("!top")) {
    const args = message.content.split(" ").slice(1);
    const param = args[0]?.toLowerCase();

    switch (param) {
      case "plays":
        return await ProcessPlayCount(message);
      case "locations":
        return await ProcessTopLocation(message);
      case undefined:
        return await ProcessTop(message);
      default:
        return message.reply("Invalid Query. Valid inputs are `plays` or `locations`.");
    }
  }

  if (targetMessage.startsWith("!info"))
  {
    return await ProcessInfo(message);
  }

  if(targetMessage.startsWith("!exists"))
  {
    return await ProcessCheckExists(message);
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
