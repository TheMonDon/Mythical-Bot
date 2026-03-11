const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class EconomyStats extends Command {
  constructor(client) {
    super(client, {
      name: 'economy-stats',
      description: 'Get the total cash, bank, and balance of the entire economy',
      category: 'Economy',
      examples: ['economystats'],
      aliases: ['etotal', 'econtotal', 'economystats', 'ecostats'],
      usage: 'economy-stats',
      guildOnly: true,
    });
  }

  async run(msg, _args) {
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

    // 1. Execute a SUM query to get totals for the specific server
    const [rows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          SUM(cash) AS total_cash,
          SUM(bank) AS total_bank
        FROM
          economy_balances
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );

    const totalCash = BigInt(rows[0]?.total_cash || 0);
    const totalBank = BigInt(rows[0]?.total_bank || 0);
    const totalBalance = totalCash + totalBank;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name}'s Economy Total`)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setDescription(`Here are the totals for the entire economy:`)
      .addFields(
        {
          name: 'Total Cash',
          value: `${this.client.util.limitStringLength(currencySymbol + totalCash.toLocaleString(), 0, 1024)}`,
          inline: false,
        },
        {
          name: 'Total Bank',
          value: `${this.client.util.limitStringLength(currencySymbol + totalBank.toLocaleString(), 0, 1024)}`,
          inline: false,
        },
        {
          name: 'Total Balance',
          value: `${this.client.util.limitStringLength(currencySymbol + totalBalance.toLocaleString(), 0, 1024)}`,
          inline: false,
        },
      )
      .setTimestamp();

    await msg.channel.send({ embeds: [embed] });
  }
}

module.exports = EconomyStats;
