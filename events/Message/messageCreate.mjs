import { ChannelType, EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
import { promisify } from 'util';
const setTimeoutPromise = promisify(setTimeout);

const db = new QuickDB();

async function hasPermissionToSendMessage(client, message) {
  if (!message.guild) return true;
  const me = message.guild.members.me;
  if (!me.permissions.has('SendMessages')) return false;
  if (me.isCommunicationDisabled()) return false;
  return message.channel.permissionsFor(client.user.id).has('SendMessages');
}

async function handleEconomyEvent(client, message) {
  if (message.channel.type === ChannelType.DM) return;
  if (!message.guild) return;
  const connection = await client.db.getConnection();

  try {
    const [economyRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [message.guild.id],
    );

    const min = economyRows[0]?.chat_min || 10;
    const max = economyRows[0]?.chat_max || 100;

    const [cooldownRows] = await connection.execute(
      /* sql */ `
        SELECT
          duration
        FROM
          cooldown_settings
        WHERE
          server_id = ?
          AND cooldown_name = 'chat'
      `,
      [message.guild.id],
    );
    const cooldown = cooldownRows[0]?.duration || 60;

    const [userCooldownRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          cooldowns
        WHERE
          user_id = ?
          AND cooldown_name = 'slut'
          AND expires_at > NOW()
      `,
      [message.author.id],
    );
    const expiresAt = userCooldownRows[0]?.expires_at;

    if (expiresAt) {
      const timeleft = new Date(expiresAt) - Date.now();
      if (timeleft > 0 && timeleft <= cooldown * 1000) {
        connection.release();
        return;
      }
    }

    await connection.execute(
      /* sql */ `
        INSERT INTO
          cooldowns (server_id, user_id, cooldown_name, expires_at)
        VALUES
          (?, ?, ?, NOW() + INTERVAL ? SECOND) ON DUPLICATE KEY
        UPDATE expires_at =
        VALUES
          (expires_at)
      `,
      [message.guild.id, message.author.id, 'chat', cooldown],
    );

    const amount = BigInt(Math.floor(Math.random() * (max - min + 1) + min));
    const cash = BigInt(
      (await db.get(`servers.${message.guild.id}.users.${message.author.id}.economy.cash`)) ||
        economyRows[0]?.start_balance ||
        0,
    );
    const newAmount = cash + amount;
    await db.set(`servers.${message.guild.id}.users.${message.author.id}.economy.cash`, newAmount.toString());
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}

async function handleChatbot(client, message) {
  const connection = await client.db.getConnection();

  try {
    const chatbotResponse = await client.util.chatbotApiRequest(client, message);
    if (chatbotResponse?.toString().startsWith('Please wait')) {
      await message.reply({
        content: chatbotResponse,
        allowedMentions: { repliedUser: false },
      });
      return;
    } else if (chatbotResponse?.toString().startsWith('disabled')) {
      return;
    }

    let reply = chatbotResponse?.choices?.[0]?.message?.content?.replace('{message.guild.name}', message.guild.name);
    if (reply) {
      reply = await client.util.clean(client, reply);
      function splitMessage(text, maxLength = 2000) {
        const lines = text.split('\n');
        const chunks = [];
        let current = '';

        for (const line of lines) {
          if ((current + '\n' + line).length > maxLength) {
            if (current) chunks.push(current);
            if (line.length > maxLength) {
              // Split long line further
              const parts = line.match(new RegExp(`.{1,${maxLength}}`, 'g'));
              chunks.push(...parts);
              current = '';
            } else {
              current = line;
            }
          } else {
            current += (current ? '\n' : '') + line;
          }
        }

        if (current) chunks.push(current);
        return chunks;
      }

      const chunks = splitMessage(reply);

      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
          try {
            await message.reply({
              content: chunks[i],
              allowedMentions: { repliedUser: false },
            });
          } catch (_e) {
            await message.channel.send({ content: chunks[i] });
          }
        } else {
          await setTimeoutPromise(2000);
          await message.channel.send({ content: chunks[i] });
        }
      }

      await connection.execute(/* sql */ `
        INSERT INTO
          chatbot_stats (id, total_runs)
        VALUES
          (1, 1) ON DUPLICATE KEY
        UPDATE total_runs = total_runs + 1;
      `);
    } else if (chatbotResponse && !reply) {
      console.error('Chatbot response is empty or malformed:', chatbotResponse);

      await message.reply({
        content: "Sorry, I couldn't generate a response. Please try again later.",
        allowedMentions: { repliedUser: false },
      });
    }
  } catch (err) {
    console.error('Chatbot error:', err);
  } finally {
    connection.release();
  }
}

export async function run(client, message) {
  if (message.author.bot) return;
  if (!(await hasPermissionToSendMessage(client, message))) return;

  const connection = await client.db.getConnection();

  try {
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
      await handleEconomyEvent(client, message);
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
    let isAlias = false;
    let aliasName = null;
    let command = client.commands.get(commandName);
    if (!command) {
      command = client.commands.get(client.aliases.get(commandName));
      aliasName = commandName;
      isAlias = !!client.aliases.get(commandName);
    }

    // If no command found but bot was mentioned, handle chatbot
    if (!command) {
      await handleChatbot(client, message);
      return;
    }

    if (message.guild) {
      const [blacklistRows] = await connection.execute(
        `SELECT * FROM server_blacklists WHERE server_id = ? AND user_id = ?`,
        [message.guild.id, message.author.id],
      );

      const blacklisted = blacklistRows[0]?.blacklisted;
      const reason = blacklistRows[0]?.reason || 'No reason provided';

      if (blacklisted && level < 4 && (command.help.name !== 'blacklist' || command.help.name !== 'global-blacklist')) {
        const embed = new EmbedBuilder()
          .setTitle('Server Blacklisted')
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
          .setColor(message.settings.embedErrorColor)
          .setDescription(
            `Sorry ${message.author.username}, you are currently blacklisted from using commands in this server.`,
          )
          .addFields([{ name: 'Reason', value: reason, inline: false }]);

        return message.channel.send({ embeds: [embed] });
      }
    }

    const [gblacklistRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          global_blacklists
        WHERE
          user_id = ?
      `,
      [message.author.id],
    );
    const globalBlacklisted = gblacklistRows[0]?.blacklisted;

    if (
      globalBlacklisted &&
      level < 8 &&
      (command.help.name !== 'blacklist' || command.help.name !== 'global-blacklist')
    ) {
      const blacklistReason = gblacklistRows[0]?.reason || 'No reason provided';
      const embed = new EmbedBuilder()
        .setTitle('Global Blacklisted')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setColor(message.settings.embedErrorColor)
        .setDescription(`Sorry ${message.author.username}, you are currently blacklisted from using commands.`)
        .addFields([{ name: 'Reason', value: blacklistReason, inline: false }]);

      return message.channel.send({ embeds: [embed] });
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

    await command.run(message, args, level);
    const isText = true;
    const isSlash = false;

    await connection.query('CALL updateCommandStats(?, ?, ?, ?, ?)', [
      command.help.name,
      isText ? 1 : 0,
      isSlash ? 1 : 0,
      isAlias ? 1 : 0,
      aliasName || null,
    ]);
  } catch (error) {
    console.error('Error running command:', error);
    return message.channel.send('There was an error executing that command.');
  } finally {
    connection.release();
  }
}
