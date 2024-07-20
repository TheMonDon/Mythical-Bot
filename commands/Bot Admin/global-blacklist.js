const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Blacklist extends Command {
  constructor(client) {
    super(client, {
      name: 'global-blacklist',
      description: 'Blacklist someone from using the bot',
      usage: 'global-blacklist <Add | Remove | Check> <User> <Reason>',
      requiredArgs: 1,
      category: 'Bot Admin',
      permLevel: 'Bot Admin',
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

    const blacklist = await db.get(`users.${mem.id}.blacklist`);

    const embed = new EmbedBuilder()
      .setAuthor({ name: mem.user.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setTimestamp();

    switch (type) {
      case 'add': {
        if (blacklist) {
          return msg.channel.send('That user is already blacklisted.');
        }
        if (!reason) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Reason');

        await db.set(`users.${mem.id}.blacklist`, true);
        await db.set(`users.${mem.id}.blacklistReason`, reason);

        embed.setTitle(`${mem.user.tag} has been added to the global blacklist.`).addFields([
          { name: 'Reason:', value: reason },
          { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
          { name: 'Server:', value: `${msg.guild.name} \n(${msg.guild.id})` },
        ]);

        msg.channel.send({ embeds: [embed] });
        return mem.send({ embeds: [embed] });
      }

      case 'remove': {
        if (!blacklist) return msg.channel.send('That user is not blacklisted');
        if (!reason) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Reason');

        await db.set(`users.${mem.id}.blacklist`, false);
        await db.set(`users.${mem.id}.blacklistReason`, reason);

        embed.setTitle(`${mem.user.tag} has been removed from the global blacklist.`).addFields([
          { name: 'Reason:', value: reason },
          { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
          { name: 'Server:', value: `${msg.guild.name} \n(${msg.guild.id})` },
        ]);

        msg.channel.send({ embeds: [embed] });
        return mem.send({ embeds: [embed] });
      }

      case 'check': {
        const reason = (await db.get(`users.${mem.id}.blacklistReason`)) || false;

        embed.setTitle(`${mem.user.tag} blacklist check`).addFields([
          { name: 'Member:', value: `${mem.user.tag} (${mem.id})`, inline: true },
          { name: 'Is Blacklisted?', value: blacklist ? 'True' : 'False' },
        ]);
        if (reason) embed.addFields([{ name: 'Reason', value: reason, inline: true }]);

        return msg.channel.send({ embeds: [embed] });
      }
    }
  }
}

module.exports = Blacklist;
