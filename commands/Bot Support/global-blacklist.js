const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class GlobalBlacklist extends Command {
  constructor(client) {
    super(client, {
      name: 'global-blacklist',
      description: 'Add, remove, or check if a user is on the global blacklist',
      usage: 'global-blacklist <Add | Remove | Check> <User> <Reason>',
      examples: ['global-blacklist check bunny', 'global-blacklist add bunny Being naughty'],
      category: 'Bot Support',
      permLevel: 'Bot Support',
      aliases: ['gbl', 'g-blacklist', 'gblacklist'],
      requiredArgs: 2,
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
        mem = await this.client.util.getMember(msg, args[1]);
      }
    } else if (args[0]) {
      // Check if the first argument is a user mention
      if (args[0].match(/^<@!?(\d+)>$/)) {
        const userId = args[0].replace(/[<@!>]/g, ''); // Extract user ID from mention
        try {
          mem = await this.client.users.fetch(userId); // Fetch the user by ID
        } catch (err) {
          // If no user is found, return error
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'User not found');
        }
      } else {
        // Otherwise, try to get member from guild
        mem = await this.client.util.getMember(msg, args[0]);
        type = 'check'; // Default to check if no action specified
      }
    }

    // If a user ID is provided directly in the second argument
    if (!mem && args[1]) {
      const userId = args[1].replace(/[<@!>]/g, ''); // Extract user ID from mention
      try {
        mem = await this.client.users.fetch(userId); // Fetch the user by ID
      } catch (err) {
        // If no user is found, return error
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'User not found');
      }
    }

    // If no member or user is found
    if (!mem) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'User not found');
    }
    mem = mem.user ? mem.user : mem;

    args.shift();
    args.shift();
    const reason = args.join(' ') || false;

    const connection = await this.client.db.getConnection();
    const [blacklistRows] = await connection.execute(`SELECT * FROM global_blacklists WHERE user_id = ?`, [mem.id]);
    const blacklisted = blacklistRows[0]?.blacklisted;

    const embed = new EmbedBuilder()
      .setAuthor({ name: mem.tag, iconURL: mem.displayAvatarURL() })
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
            'The reason provided is too long. Please keep it under 1024 characters.',
            'Reason Too Long',
          );
        }

        await connection.execute(
          `INSERT INTO global_blacklists (user_id, blacklisted, reason)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE blacklisted = VALUES(blacklisted), reason = VALUES(reason)`,
          [mem.id, true, reason],
        );

        embed.setTitle(`${mem.tag} has been added to the global blacklist.`).addFields([
          { name: 'User:', value: `${mem.tag} \n(${mem.id})` },
          { name: 'Reason:', value: reason },
        ]);

        connection.release();
        msg.channel.send({ embeds: [embed] });
        return mem.send({ embeds: [embed] }).catch(() => {});
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
            'The reason provided is too long. Please keep it under 1024 characters.',
            'Reason Too Long',
          );
        }

        await connection.execute(
          `INSERT INTO global_blacklists (user_id, blacklisted, reason)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE blacklisted = VALUES(blacklisted), reason = VALUES(reason)`,
          [mem.id, false, reason],
        );

        embed.setTitle(`${mem.tag} has been removed from the global blacklist.`).addFields([
          { name: 'User:', value: `${mem.tag} \n(${mem.id})` },
          { name: 'Reason:', value: reason },
        ]);

        connection.release();
        msg.channel.send({ embeds: [embed] });
        return mem.send({ embeds: [embed] }).catch(() => {});
      }

      case 'check': {
        const blacklistReason = blacklistRows[0]?.reason || 'No reason provided';

        embed.setTitle(`${mem.tag} blacklist check`).addFields([
          { name: 'User:', value: `${mem.tag} (${mem.id})`, inline: true },
          { name: 'Is Blacklisted?', value: blacklisted ? 'True' : 'False', inline: true },
          { name: 'Reason', value: blacklistReason, inline: true },
        ]);

        connection.release();
        return msg.channel.send({ embeds: [embed] });
      }

      default: {
        connection.release();
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
      }
    }
  }
}

module.exports = GlobalBlacklist;
