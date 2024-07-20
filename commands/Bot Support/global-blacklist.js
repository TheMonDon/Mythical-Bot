const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class GlobalBlacklist extends Command {
  constructor(client) {
    super(client, {
      name: 'global-blacklist',
      description: 'Blacklist someone from using the bot',
      usage: 'global-blacklist <Add | Remove | Check> <User> <Reason>',
      requiredArgs: 1,
      category: 'Bot Support',
      permLevel: 'Bot Support',
      aliases: ['gbl', 'g-blacklist', 'gblacklist'],
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

    args.shift();
    args.shift();
    const reason = args.join(' ') || false;

    const blacklist = await db.get(`users.${mem.id}.blacklist`);

    const embed = new EmbedBuilder()
      .setAuthor({ name: mem.tag, iconURL: mem.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setTimestamp();

    switch (type) {
      case 'add': {
        if (blacklist) {
          return msg.channel.send('That user is already blacklisted.');
        }
        if (!reason) {
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Reason');
        }

        await db.set(`users.${mem.id}.blacklist`, true);
        await db.set(`users.${mem.id}.blacklistReason`, reason);

        embed.setTitle(`${mem.tag} has been added to the global blacklist.`).addFields([
          { name: 'Reason:', value: reason },
          { name: 'User:', value: `${mem.tag} \n(${mem.id})` },
        ]);

        msg.channel.send({ embeds: [embed] });
        mem.send({ embeds: [embed] }).catch(() => {});
        break;
      }

      case 'remove': {
        if (!blacklist) {
          return msg.channel.send('That user is not blacklisted');
        }
        if (!reason) {
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Reason');
        }

        await db.set(`users.${mem.id}.blacklist`, false);
        await db.set(`users.${mem.id}.blacklistReason`, reason);

        embed.setTitle(`${mem.tag} has been removed from the global blacklist.`).addFields([
          { name: 'Reason:', value: reason },
          { name: 'User:', value: `${mem.tag} \n(${mem.id})` },
        ]);

        msg.channel.send({ embeds: [embed] });
        mem.send({ embeds: [embed] }).catch(() => {});
        break;
      }

      case 'check': {
        const reason = (await db.get(`users.${mem.id}.blacklistReason`)) || 'No reason specified';

        embed
          .setTitle(`${mem.tag} blacklist check`)
          .addFields([
            { name: 'User:', value: `${mem.tag} (${mem.id})`, inline: true },
            { name: 'Is Blacklisted?', value: blacklist ? 'True' : 'False', inline: true },
          ])
          .addField('Reason:', reason);

        msg.channel.send({ embeds: [embed] });
        break;
      }

      default:
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }
  }
}

module.exports = GlobalBlacklist;
