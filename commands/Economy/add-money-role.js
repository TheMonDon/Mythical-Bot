const Command = require('../../base/Command.js');
const { getRole } = require('../../util/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

class AddMoneyRole extends Command {
  constructor (client) {
    super(client, {
      name: 'add-money-role',
      category: 'Economy',
      description: 'Add money to a role\'s members cash or bank balance. \nIf the cash or bank argument isn\'t given, it will be added to the cash part.',
      usage: 'add-money-role <cash | bank> <role> <amount>',
      aliases: ['addmoneyrole', 'addbalrole'],
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}add-money-role <cash | bank> <role> <amount>`;

    const errEmbed = new DiscordJS.EmbedBuilder()
      .setColor('#EC5454')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (!msg.member.permissions.has('MANAGE_GUILD')) {
      errEmbed.setDescription('You are missing the **Manage Guild** permission.');
      return msg.channel.send({ embeds: [errEmbed] });
    }

    let type = 'cash';
    let role;
    let amount;

    if (!args || args.length < 2) {
      errEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (args.length === 2) {
      role = getRole(msg, args[0]);
      amount = parseInt(args[1].replace(cs, '').replace(/,/g, ''), 10);
    } else {
      role = getRole(msg, args[1]);
      amount = parseInt(args[2].replace(cs, '').replace(/,/g, ''), 10);
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount) || amount === Infinity) {
      errEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    if (!role) {
      errEmbed.setDescription(stripIndents`
      :x: Invalid role given.

      Usage: ${msg.settings.prefix}add-money-role <cash | bank> <role> <amount>
      `);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    const members = [...role.members.values()];

    if (type === 'bank') {
      members.forEach(mem => {
        if (!mem.user.bot) {
          const current = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`);
          if ((current + amount) !== Infinity) db.add(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, amount);
        }
      });
    } else {
      members.forEach(mem => {
        if (!mem.user.bot) {
          const cash = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
          const newAmount = cash + amount;
          if (newAmount !== Infinity) db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount);
        }
      });
    }
    const embed = new DiscordJS.EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor('#0099CC')
      .setDescription(`:white_check_mark: Added **${cs}${amount.toLocaleString()}** to ${type} balance of ${members.length} ${members.length > 1 ? 'members' : 'member'} with the ${role}.`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = AddMoneyRole;
