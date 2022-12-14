const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class RemoveMoney extends Command {
  constructor (client) {
    super(client, {
      name: 'remove-money',
      category: 'Economy',
      description: 'Remove money from a users\'s cash or bank balance. \nIf the cash or bank argument isn\'t given, it will be added to the cash part.',
      usage: 'remove-money [cash | bank] <member> <amount>',
      aliases: ['removemoney', 'removebal'],
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}remove-money [cash | bank] <member> <amount>`;

    const errEmbed = new EmbedBuilder()
      .setColor('#EC5454')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (!msg.member.permissions.has('ManageGuild')) {
      errEmbed.setDescription('You are missing the **Manage Guild** permission.');
      return msg.channel.send({ embeds: [errEmbed] });
    }

    let type = 'cash';
    let mem;
    let amount;

    if (!args || args.length < 2) {
      errEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (args.length === 2) {
      mem = await getMember(msg, args[0]);
      amount = parseInt(args[1].replace(cs, '').replace(/,/ig, ''), 10);
    } else {
      mem = await getMember(msg, args[1]);
      amount = parseInt(args[2].replace(cs, '').replace(/,/ig, ''), 10);
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount)) {
      errEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    if (!mem) {
      errEmbed.setDescription(stripIndents`
      :x: Invalid member given.

      Usage: ${msg.settings.prefix}remove-money <cash | bank> <member> <amount>
      `);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    if (mem.user.bot) {
      errEmbed.setDescription('You can\'t add money to bots.');
      return msg.channel.send({ embeds: [errEmbed] });
    }

    if (type === 'bank') {
      db.subtract(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, amount);
    } else {
      const cash = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
      const newAmount = cash - amount;
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount);
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setDescription(`:white_check_mark: Removed **${cs}${amount.toLocaleString()}** from ${mem}'s ${type} balance.`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RemoveMoney;
