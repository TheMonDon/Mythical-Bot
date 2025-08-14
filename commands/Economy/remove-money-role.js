const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class RemoveMoneyRole extends Command {
  constructor(client) {
    super(client, {
      name: 'remove-money-role',
      category: 'Economy',
      description:
        "Remove money from a roles members cash or bank balance. \nIf the cash or bank argument isn't given, it will be removed from the cash part.",
      usage: 'remove-money-role [cash | bank] <role> <amount>',
      aliases: ['removemoneyrole', 'removebalrole', 'rmrole'],
      permLevel: 'Administrator',
      requiredArgs: 2,
      examples: [
        'remove-money-role cash bunny 100',
        'remove-money-role cash Admin 200',
        'remove-money-role Owner 300',
        'remove-money-role bank @memberOrRole 420',
      ],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    let type = 'cash';
    let role;
    let amount;

    if (args.length === 2) {
      role = this.client.util.getRole(msg, args[0]);
      amount = args[1].replace(/[^0-9\\.]/g, '');
    } else {
      role = this.client.util.getRole(msg, args[1]);
      amount = args[2].replace(/[^0-9\\.]/g, '');
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount) || amount === Infinity) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Amount');
    }
    if (!role) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Role');
    }

    const [economyRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          guild_id = ?
      `,
      [msg.guild.id],
    );

    // Ensure the members cache is populated
    await msg.guild.members.fetch();
    const members = [...role.members.values()];

    amount = BigInt(parseInt(amount));
    members.forEach(async (member) => {
      if (member.user.bot) return;
      if (type === 'bank') {
        const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${member.id}.economy.bank`)) || 0);
        const newAmount = bank - amount;
        await db.set(`servers.${msg.guild.id}.users.${member.id}.economy.bank`, newAmount.toString());
      } else {
        const cash = BigInt(
          (await db.get(`servers.${msg.guild.id}.users.${member.id}.economy.cash`)) ||
            economyRows[0]?.start_balance ||
            0,
        );
        const newAmount = cash - amount;
        await db.set(`servers.${msg.guild.id}.users.${member.id}.economy.cash`, newAmount.toString());
      }
    });

    const currencySymbol = economyRows[0]?.symbol || '$';
    connection.release();

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

    embed
      .setColor(msg.settings.embedColor)
      .setDescription(
        `Removed **${csAmount}** from the ${type} balance of ${members.length} ${
          members.length > 1 ? 'members' : 'member'
        } with the ${role} role.`,
      )
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RemoveMoneyRole;
