const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Blacklist extends Command {
  constructor(client) {
    super(client, {
      name: 'blacklist',
      description: 'Blacklist someone from using the bot in your server',
      usage: 'blacklist <Add | Remove | Check> <User> <Reason>',
      examples: ['blacklist check bunny', 'blacklist add bunny Being naughty'],
      requiredArgs: 1,
      category: 'Moderator',
      permLevel: 'Moderator',
      aliases: ['bl'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let mem;
    let type;

    if (args[0] && args[1]) {
      if (!['add', 'remove', 'check'].includes(args[0].toLowerCase())) {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
      } else {
        type = args[0].toLowerCase();
      }
    } else if (args[0]) {
      mem = await this.client.util.getMember(msg, args[0]);
      type = 'check';

      if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    if (!mem && args[1]) {
      mem = await this.client.util.getMember(msg, args[1]);

      if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    }

    args.shift();
    args.shift();
    const reason = args.join(' ') || false;

    const connection = await this.client.db.getConnection();
    const [blacklistRows] = await connection.execute(
      `SELECT * FROM server_blacklists WHERE server_id = ? AND user_id = ?`,
      [msg.guild.id, mem.id],
    );

    const blacklisted = blacklistRows[0]?.blacklisted;

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setTimestamp();

    switch (type) {
      case 'add': {
        if (blacklisted) {
          connection.release();
          return msg.channel.send('That user is already blacklisted.');
        }

        if (!reason) {
          connection.release();
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Reason');
        }

        if (reason.length > 1024) {
          connection.release();
          return this.client.util.errorEmbed(
            msg,
            msg.settings.prefix + this.help.usage,
            'Reason must be less than 1024 characters',
          );
        }

        await connection.execute(
          `INSERT INTO server_blacklists (server_id, user_id, blacklisted, reason)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE blacklisted = VALUES(blacklisted), reason = VALUES(reason)`,
          [msg.guild.id, mem.id, true, reason],
        );

        embed.setTitle(`${mem.user.tag} has been added to the blacklist.`).addFields([
          { name: 'Reason:', value: reason },
          { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
          { name: 'Server:', value: `${msg.guild.name} \n(${msg.guild.id})` },
        ]);

        connection.release();
        msg.channel.send({ embeds: [embed] });
        return mem.send({ embeds: [embed] });
      }

      case 'remove': {
        if (!blacklisted) {
          connection.release();
          return msg.channel.send('That user is not blacklisted');
        }

        if (!reason) {
          connection.release();
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Reason');
        }

        if (reason.length > 1024) {
          connection.release();
          return this.client.util.errorEmbed(
            msg,
            msg.settings.prefix + this.help.usage,
            'Reason must be less than 1024 characters',
          );
        }

        await connection.execute(
          `INSERT INTO server_blacklists (server_id, user_id, blacklisted, reason)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE blacklisted = VALUES(blacklisted), reason = VALUES(reason)`,
          [msg.guild.id, mem.id, false, reason],
        );

        embed.setTitle(`${mem.user.tag} has been removed from the blacklist.`).addFields([
          { name: 'Reason:', value: reason },
          { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
          { name: 'Server:', value: `${msg.guild.name} \n(${msg.guild.id})` },
        ]);

        connection.release();
        msg.channel.send({ embeds: [embed] });
        return mem.send({ embeds: [embed] });
      }

      case 'check': {
        const blacklistReason = blacklistRows[0]?.reason || 'No reason provided';

        embed.setTitle(`${mem.user.tag} blacklist check`).addFields([
          { name: 'Member:', value: `${mem.user.tag} (${mem.id})`, inline: true },
          { name: 'Is Blacklisted?', value: blacklisted ? 'True' : 'False' },
          { name: 'Reason', value: blacklistReason, inline: true },
        ]);

        connection.release();
        return msg.channel.send({ embeds: [embed] });
      }
    }
  }
}

module.exports = Blacklist;
