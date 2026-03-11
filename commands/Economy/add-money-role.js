const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

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
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    let type = 'cash';
    let role;
    let amount;

    const [economyRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const currencySymbol = economyRows[0]?.symbol || '$';

    if (args.length === 2) {
      role = this.client.util.getRole(msg, args[0]);
      amount = args[1]
        .replace(/\..*/, '') // Remove everything after the first period
        .replace(/[^0-9,]/g, '') // Keep only digits and commas
        .replace(/,/g, ''); // Remove commas
    } else {
      role = this.client.util.getRole(msg, args[1]);
      amount = parseInt(
        args[2]
          .replace(/\..*/, '') // Remove everything after the first period
          .replace(/[^0-9,]/g, '') // Keep only digits and commas
          .replace(/,/g, ''), // Remove commas
      );
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

    amount = BigInt(amount);
    if (type === 'bank') {
      members.forEach(async (mem) => {
        if (!mem.user.bot) {
          await this.client.db.execute(
            /* sql */
            `
              INSERT INTO
                economy_balances (server_id, user_id, bank)
              VALUES
                (?, ?, ?) ON DUPLICATE KEY
              UPDATE bank = bank +
              VALUES
                (bank)
            `,
            [msg.guild.id, mem.id, amount.toString()],
          );
        }
      });
    } else {
      members.forEach(async (mem) => {
        if (!mem.user.bot) {
          await this.client.db.execute(
            /* sql */
            `
              INSERT INTO
                economy_balances (server_id, user_id, cash)
              VALUES
                (?, ?, ?) ON DUPLICATE KEY
              UPDATE cash = cash +
              VALUES
                (cash)
            `,
            [msg.guild.id, mem.id, amount.toString()],
          );
        }
      });
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
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
