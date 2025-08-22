const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class LogToggle extends Command {
  constructor(client) {
    super(client, {
      name: 'log-toggle',
      description: 'Toggle individual logs or logging of a channel',
      usage: 'log-toggle <module | enable | disable> [channel]',
      category: 'Logging',
      permLevel: 'Moderator',
      aliases: ['togglelog', 'logtoggle'],
      examples: ['log-toggle channel-created', 'log-toggle disable #logs'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();
    const query = args.join(' ').toLowerCase();

    try {
      // Get current settings
      const [rows] = await connection.query('SELECT * FROM log_settings WHERE server_id = ? LIMIT 1', [msg.guild.id]);

      if (!rows.length) {
        return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}setup logging\``);
      }

      const settings = rows[0];
      const chans = settings.no_log_channels ? JSON.parse(settings.no_log_channels) : [];

      if (['enable', 'disable'].includes(args?.[0]?.toLowerCase())) {
        if (!args[1]) {
          return msg.channel.send('Please provide a valid channel to enable/disable logging from.');
        }

        const chan = this.client.util.getChannel(msg, args[1]);
        if (!chan) return msg.channel.send('I could not find a channel with that information.');

        if (args?.[0]?.toLowerCase() === 'enable') {
          // Enable channel
          if (chans && !chans.includes(chan.id)) return msg.channel.send('That channel is already enabled.');

          const indx = chans.indexOf(chan.id);

          if (indx > -1) {
            chans.splice(indx, 1);
            await connection.execute(
              /* sql */ `
                UPDATE log_settings
                SET
                  no_log_channels = ?
                WHERE
                  server_id = ?
              `,
              [JSON.stringify(chans), msg.guild.id],
            );

            return msg.channel.send(`Successfully removed ${chan.name} (${chan.id}) from the channel blacklist.`);
          } else {
            return msg.channel.send('That channel is not on the blacklist, did you mean to disable logging?');
          }
        } else if (args?.[0].toLowerCase() === 'disable') {
          // disable channel

          if (chans && chans.includes(chan.id)) {
            return msg.channel.send('That channel is already disabled.');
          }

          chans.push(chan.id);
          await connection.execute(
            /* sql */ `
              UPDATE log_settings
              SET
                no_log_channels = ?
              WHERE
                server_id = ?
            `,
            [JSON.stringify(chans), msg.guild.id],
          );

          return msg.channel.send(`Successfully added ${chan.name} (${chan.id}) to the channel blacklist.`);
        }
      }

      // Map regex patterns to DB columns
      const logMap = {
        'bulk-messages-deleted': [/^(bulk[\s-_]?messages[\s-_]?deleted)/i, 'bulk_messages_deleted'],
        'channel-created': [/^(channel[\s-_]?created)/i, 'channel_created'],
        'channel-deleted': [/^(channel[\s-_]?deleted)/i, 'channel_deleted'],
        'channel-updated': [/^(channel[\s-_]?updated)/i, 'channel_updated'],
        'thread-created': [/^(thread[\s-_]?created)/i, 'thread_created'],
        'thread-deleted': [/^(thread[\s-_]?deleted)/i, 'thread_deleted'],
        'thread-updated': [/^(thread[\s-_]?updated)/i, 'thread_updated'],
        'voice-channel-created': [/^((voice|v)[\s-_]?channel[\s-_]?created)/i, 'v_channel_created'],
        'voice-channel-deleted': [/^((voice|v)[\s-_]?channel[\s-_]?deleted)/i, 'v_channel_deleted'],
        'member-join': [/^(member[\s-_]?join(ed)?)/i, 'member_join'],
        'member-leave': [/^(member[\s-_]?leave)/i, 'member_leave'],
        'member-timeout': [/^(member[\s-_]?timeout)/i, 'member_timeout'],
        'message-updated': [/^(message[\s-_]?(edited|updated))/i, 'message_updated'],
        'message-deleted': [/^(message[\s-_]?deleted)/i, 'message_deleted'],
        'role-created': [/^(role[\s-_]?created)/i, 'role_created'],
        'role-deleted': [/^(role[\s-_]?deleted)/i, 'role_deleted'],
        'role-updated': [/^(role[\s-_]?updated)/i, 'role_updated'],
        'emoji-created': [/^(emoji[\s-_]?created)/i, 'emoji_created'],
        'emoji-deleted': [/^(emoji[\s-_]?deleted)/i, 'emoji_deleted'],
        'emoji-updated': [/^(emoji[\s-_]?updated)/i, 'emoji_updated'],
        'sticker-created': [/^(sticker[\s-_]?created)/i, 'sticker_created'],
        'sticker-deleted': [/^(sticker[\s-_]?deleted)/i, 'sticker_deleted'],
        'sticker-updated': [/^(sticker[\s-_]?updated)/i, 'sticker_updated'],
      };

      let matchedColumn = null;
      for (const [, [regex, column]] of Object.entries(logMap)) {
        if (regex.test(query)) {
          matchedColumn = column;
          break;
        }
      }

      if (!matchedColumn) {
        const errorEmbed = new EmbedBuilder()
          .setTitle(':x: Invalid parameter.')
          .setDescription(
            'Valid options are:\n' +
              Object.keys(logMap)
                .map((k) => `\`${k}\``)
                .join(', '),
          )
          .addFields([
            {
              name: 'No Log Channels',
              value: Array.isArray(chans) && chans.length ? chans.map((c) => `<#${c}>`).join(', ') : 'None',
            },
          ]);

        return msg.channel.send({ embeds: [errorEmbed] });
      }

      // Toggle the setting
      const currentValue = settings[matchedColumn] === 1;
      const newValue = !currentValue;

      // Update the column
      await connection.query(`UPDATE log_settings SET ${matchedColumn} = ? WHERE server_id = ?`, [
        newValue,
        msg.guild.id,
      ]);

      // If disabling, also flip all_enabled to false
      if (!newValue && settings.all_enabled === 1) {
        await connection.query(`UPDATE log_settings SET all_enabled = FALSE WHERE server_id = ?`, [msg.guild.id]);
      }

      return msg.channel.send(`\`${matchedColumn}\` has been ${newValue ? 'enabled ✅' : 'disabled ❌'}.`);
    } catch (error) {
      this.client.logger.error(error);
      return msg.channel.send(`An error occurred: ${error.message}`);
    } finally {
      connection.release();
    }
  }
}

module.exports = LogToggle;
