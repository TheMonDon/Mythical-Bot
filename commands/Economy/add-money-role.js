const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class AddMoneyRole extends Command {
  constructor(client) {
    super(client, {
      name: 'add-money-role',
      category: 'Economy',
      description:
        "Add money to a role's members cash or bank balance. \nIf the cash or bank argument isn't given, it will be added to the cash part.",
      usage: 'add-money-role [cash | bank] <role> <amount>',
      aliases: ['addmoneyrole', 'addbalrole'],
      permLevel: 'Administrator',
      guildOnly: true,
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    const errEmbed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    let type = 'cash';
    let role;
    let amount;

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    if (args.length === 2) {
      role = this.client.util.getRole(msg, args[0]);
      amount = args[1].replace(/[^0-9].*/, '').replace(/[^0-9]/g, '');
    } else {
      role = this.client.util.getRole(msg, args[1]);
      amount = args[2].replace(/[^0-9].*/, '').replace(/[^0-9]/g, '');
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount))
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    if (amount > 1000000000000)
      return this.client.util.errorEmbed(msg, `You can't add more than 1 Trillion to a role.`, 'Invalid Amount');

    if (!role) {
      errEmbed.setDescription(stripIndents`
      :x: Invalid role given.

      Usage: ${msg.settings.prefix + this.help.usage}
      `);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    const members = [...role.members.values()];

    amount = BigInt(parseInt(amount));
    if (type === 'bank') {
      members.forEach(async (mem) => {
        if (!mem.user.bot) {
          const current = BigInt((await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`)) || 0);
          const newAmount = current + amount;
          await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, newAmount.toString());
        }
      });
    } else {
      members.forEach(async (mem) => {
        if (!mem.user.bot) {
          const cash = BigInt(
            (await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`)) ||
              (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) ||
              0,
          );
          const newAmount = cash + amount;
          await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount.toString());
        }
      });
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setDescription(
        `Added **${csAmount}** to the ${type} balance of ${members.length} ${
          members.length > 1 ? 'members' : 'member'
        } with the ${role} role.`,
      )
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = AddMoneyRole;
