import { ChannelType, EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';

const db = new QuickDB();

async function hasPermissionToSendMessage(client, message) {
  if (!message.guild) return true;
  const me = message.guild.members.me;
  if (!me.permissions.has('SendMessages')) return false;
  if (me.isCommunicationDisabled()) return false;
  return message.channel.permissionsFor(client.user.id).has('SendMessages');
}

async function handleEconomyEvent(message) {
  if (message.channel.type === ChannelType.DM) return;
  if (!message.guild) return;

  const min = (await db.get(`servers.${message.guild.id}.economy.chat.min`)) || 10;
  const max = (await db.get(`servers.${message.guild.id}.economy.chat.max`)) || 100;

  const now = Date.now();
  const cooldown = (await db.get(`servers.${message.guild.id}.economy.chat.cooldown`)) || 60;
  let userCooldown =
    (await db.get(`servers.${message.guild.id}.users.${message.author.id}.economy.chat.cooldown`)) || {};

  if (userCooldown.active && userCooldown.time - now > 0 && userCooldown.time - now < cooldown * 1000) {
    return;
  }

  userCooldown = { active: true, time: now + cooldown * 1000 };
  await db.set(`servers.${message.guild.id}.users.${message.author.id}.economy.chat.cooldown`, userCooldown);

  const amount = BigInt(Math.floor(Math.random() * (max - min + 1) + min));
  const cash = BigInt(
    (await db.get(`servers.${message.guild.id}.users.${message.author.id}.economy.cash`)) ||
      (await db.get(`servers.${message.guild.id}.economy.startBalance`)) ||
      0,
  );
  const newAmount = cash + amount;
  await db.set(`servers.${message.guild.id}.users.${message.author.id}.economy.cash`, newAmount.toString());

  setTimeout(async () => {
    if (!message.guild) return;
    await db.set(`servers.${message.guild.id}.users.${message.author.id}.economy.chat.cooldown`, { active: false });
  }, cooldown * 1000);
}

async function handleChatbot(client, message) {
  try {
    // Check if bot is mentioned anywhere in the message or if it's a reply to the bot with mention
    const shouldTriggerChatbot =
      message.mentions.has(client.user) || (message.reference && message.mentions.has(client.user));

    if (shouldTriggerChatbot) {
      const chatbotResponse = await client.util.chatbotApiRequest(client, message);
      if (chatbotResponse) {
        const reply = chatbotResponse.choices?.[0]?.message?.content;
        if (!reply) return;
        await message.reply({
          content: reply,
          allowedMentions: { repliedUser: false },
        });
      }
    }
  } catch (err) {
    console.error('Chatbot error:', err);
  }
}

export async function run(client, message) {
  if (message.author.bot) return;
  if (!(await hasPermissionToSendMessage(client, message))) return;

  const settings = client.getSettings(message.guild);
  message.settings = settings;
  let prefix = settings.prefix;

  const prefixMention = new RegExp(`^(<@!?${client.user.id}>)(\\s+)?`);
  let isCommand = false;

  if (message.guild && message.content.match(prefixMention)) {
    prefix = String(message.guild.members.me);
    isCommand = true;
  } else if (message.content.indexOf(settings.prefix) === 0) {
    isCommand = true;
  }

  // Handle chatbot before economy event if not a command
  if (!isCommand) {
    await handleChatbot(client, message);
    await handleEconomyEvent(message);
    return;
  }

  // Command handling
  const args = message.content.slice(prefix.length).trim().split(/\s+/g);
  const commandName = args.shift().toLowerCase();
  if (!commandName && prefix === String(message.guild?.me)) {
    return message.channel.send(`The current prefix is: ${settings.prefix}`);
  }

  if (message.guild && !message.member) await message.guild.fetchMember(message.author);

  const level = await client.permlevel(message);
  const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));

  // If no command found but bot was mentioned, handle chatbot
  if (!command) {
    await handleChatbot(client, message);
    return;
  }

  if (message.guild) {
    const isBlacklisted = await db.get(`servers.${message.guild.id}.users.${message.author.id}.blacklist`);
    if (isBlacklisted && level < 4 && (command.help.name !== 'blacklist' || command.help.name !== 'global-blacklist')) {
      return message.channel.send(
        `Sorry ${message.member.displayName}, you are currently blacklisted from using commands in this server.`,
      );
    }
  }

  const globalBlacklisted = await db.get(`users.${message.author.id}.blacklist`);
  if (
    globalBlacklisted &&
    level < 8 &&
    (command.help.name !== 'blacklist' || command.help.name !== 'global-blacklist')
  ) {
    return message.channel.send(`Sorry ${message.author.username}, you are currently blacklisted from using commands.`);
  }

  if (!message.guild && command.conf.guildOnly) {
    return message.channel.send(
      'This command is unavailable via private message. Please run this command in a server.',
    );
  }

  if (command.conf.nsfw && !message.channel.nsfw) {
    return message.channel.send('This command can only be used in NSFW channels.');
  }

  if (!command.conf.enabled) {
    return message.channel.send('This command is currently disabled.');
  }

  if (level < client.levelCache[command.conf.permLevel]) {
    const embed = new EmbedBuilder()
      .setTitle('Missing Permission')
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
      .setColor(settings.embedErrorColor)
      .addFields([
        {
          name: 'Your Level',
          value: `${level} (${client.permLevels.find((l) => l.level === level).name})`,
          inline: true,
        },
        {
          name: 'Required Level',
          value: `${client.levelCache[command.conf.permLevel]} (${command.conf.permLevel})`,
          inline: true,
        },
      ]);

    return message.channel.send({ embeds: [embed] });
  }

  if (command.conf.requiredArgs > args.length) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setColor(settings.embedErrorColor)
      .setTitle('Missing Command Arguments')
      .setFooter({ text: '[] = optional, <> = required' })
      .addFields([
        { name: 'Incorrect Usage', value: settings.prefix + command.help.usage },
        { name: 'Examples', value: command.help.examples?.join('\n') || 'None' },
      ]);
    return message.channel.send({ embeds: [embed] });
  }

  message.author.permLevel = level;

  try {
    await db.add('global.commands', 1);
    command.run(message, args, level);
  } catch (error) {
    console.error('Error running command:', error);
    message.channel.send('There was an error executing that command.');
  }
}
