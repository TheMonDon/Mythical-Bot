const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Blacklist extends Command {
  constructor(client) {
    super(client, {
      name: 'blacklist',
      description: 'Blacklist someone from using the bot',
      usage: 'blacklist <Add | Remove | Check> <User> <Reason>',
      requiredArgs: 1,
      category: 'Moderator',
      permLevel: 'Moderator',
      aliases: ['bl'],
      guildOnly: true,
    });
  }

  async run(msg, text) {
    let mem;
    let type;

    if (text[0] && text[1]) {
      if (!['add', 'remove', 'check'].includes(text[0].toLowerCase())) {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
      } else {
        type = text[0].toLowerCase();
      }
    } else if (text[0]) {
      mem = await this.client.util.getMember(msg, text[0]);
      type = 'check';

      if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    if (!mem && text[1]) {
      mem = await this.client.util.getMember(msg, text[1]);

      if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    }

    text.shift();
    text.shift();
    const reason = text.join(' ') || false;

    const blacklist = await db.get(`servers.${msg.guild.id}.users.${mem.id}.blacklist`);

    const memberName = mem.user.discriminator === '0' ? mem.user.username : mem.user.tag;
    const embed = new EmbedBuilder()
      .setAuthor({ name: memberName, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setTimestamp();

    switch (type) {
      case 'add': {
        // Add member to blacklist
        if (blacklist) {
          return msg.channel.send('That user is already blacklisted.');
        }
        if (!reason) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Reason');

        await db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklist`, true);
        await db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`, reason);

        embed.setTitle(`${memberName} has been added to the blacklist.`).addFields([
          { name: 'Reason:', value: reason },
          { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
          { name: 'Server:', value: `${msg.guild.name} \n(${msg.guild.id})` },
        ]);

        msg.channel.send({ embeds: [embed] });
        return mem.send({ embeds: [embed] });
      }

      case 'remove': {
        // remove member from blacklist
        if (!blacklist) return msg.channel.send('That user is not blacklisted');
        if (!reason) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Reason');

        await db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklist`, false);
        await db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`, reason);

        embed.setTitle(`${memberName} has been removed to the blacklist.`).addFields([
          { name: 'Reason:', value: reason },
          { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
          { name: 'Server:', value: `${msg.guild.name} \n(${msg.guild.id})` },
        ]);

        msg.channel.send({ embeds: [embed] });
        return mem.send({ embeds: [embed] });
      }

      case 'check': {
        // check if member is blacklisted
        const reason = (await db.get(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`)) || false;

        const bl = blacklist ? 'is' : 'is not';
        embed.setTitle(`${memberName} blacklist check`).addFields([
          { name: 'Member:', value: `${memberName} (${mem.id})`, inline: true },
          { name: 'Is Blacklisted?', value: `That user ${bl} blacklisted.` },
        ]);
        if (reason) embed.addFields([{ name: 'reason', value: reason, inline: true }]);

        return msg.channel.send({ embeds: [embed] });
      }
    }
  }
}

module.exports = Blacklist;
