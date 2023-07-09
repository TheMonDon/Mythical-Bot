const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class RemoveMoneyRole extends Command {
  constructor(client) {
    super(client, {
      name: 'remove-money-role',
      category: 'Economy',
      description:
        "Remove money from a roles members cash or bank balance. \nIf the cash or bank argument isn't given, it will be removed from the cash part.",
      usage: 'remove-money-role <cash | bank> <role> <amount>',
      aliases: ['removemoneyrole', 'removebalrole'],
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}remove-money-role <cash | bank> <role> <amount>`;

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    let type = 'cash';
    let role;
    let amount;

    if (!args || args.length < 2) {
      embed.setDescription(usage);
      return msg.channel.send({ embeds: [embed] });
    }

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (args.length === 2) {
      role = this.client.util.getRole(msg, args[0]);
      amount = parseFloat(args[1].replace(currencySymbol, '').replace(',', ''));
    } else {
      role = this.client.util.getRole(msg, args[1]);
      amount = parseFloat(args[2].replace(currencySymbol, '').replace(',', ''));
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount)) {
      embed.setDescription(usage);
      return msg.channel.send({ embeds: [embed] });
    }

    if (!role) {
      embed.setDescription(stripIndents`
      :x: Invalid role given.

      Usage: ${msg.settings.prefix}remove-money=role <cash | bank> <role> <amount>
      `);
      return msg.channel.send({ embeds: [embed] });
    }

    const members = [...role.members.values()];

    if (type === 'bank') {
      members.forEach((mem) => {
        if (!mem.user.bot) db.subtract(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, amount);
      });
    } else {
      members.forEach((mem) => {
        if (!mem.user.bot) {
          const cash =
            db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) ||
            db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
            0;
          const newAmount = cash - amount;
          db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount);
        }
      });
    }

    embed
      .setColor(msg.settings.embedColor)
      .setDescription(
        `:white_check_mark: Removed **${currencySymbol}${amount.toLocaleString()}** to ${type} balance of ${
          members.length
        } ${members.length > 1 ? 'members' : 'member'} with the ${role}.`,
      )
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RemoveMoneyRole;
