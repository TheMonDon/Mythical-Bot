const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Ban extends Command {
  constructor(client) {
    super(client, {
      name: 'ban',
      description: 'Ban a naughty user',
      usage: 'ban <user> <reason>',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true,
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    if (!msg.guild.members.me.permissions.has('BanMembers'))
      return this.client.util.errorEmbed(msg, 'The bot is missing Ban Members permission.');

    const successColor = msg.settings.embedSuccessColor;
    const regex = /^\d{17,19}$/;

    let banMem = await this.client.util.getMember(msg, args[0]);
    let inGuild = true;
    if (!banMem) {
      const id = args[0].replace(/<@|>/g, '');
      if (!regex.test(id)) {
        return this.client.util.errorEmbed(msg, 'Please provide a valid user input.');
      } else {
        try {
          banMem = await this.client.users.fetch(id);
          inGuild = false;
        } catch (err) {
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
        }
      }
    }

    args.shift();
    const reason = args.join(' ');

    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();
    if (inGuild && !banMem.bannable) return this.client.util.errorEmbed(msg, 'That user is not bannable by the bot.');

    // Embed for log channel or reply
    const em = new EmbedBuilder()
      .setTitle('User Banned')
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setColor(successColor)
      .addFields([
        { name: 'User', value: `${banMem.toString()} (${banMem.id})` },
        { name: 'Banned By', value: msg.member.displayName.toString() },
        { name: 'Reason', value: reason },
      ])
      .setTimestamp();

    msg.guild.members.ban(banMem, { reason });

    const [logRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          channel_id,
          member_banned,
          no_log_channels
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const logChannelID = logRows[0].channel_id;
    const logSystem = logRows[0].member_banned;

    if (logRows.length && logChannelID && logSystem === 1) {
      // Embed for reply
      const em2 = new EmbedBuilder()
        .setTitle('User Banned')
        .setColor(successColor)
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setDescription('Full info posted in the log channel.');

      const reply = await msg.channel.send({ embeds: [em2] });
      msg.guild.channels.cache.get(logChannelID).send({ embeds: [em] });

      setTimeout(() => {
        reply.delete();
      }, 30000);
    } else {
      return msg.channel.send({ embeds: [em] });
    }
  }
}

module.exports = Ban;
