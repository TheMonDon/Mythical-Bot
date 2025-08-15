const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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
    await msg.guild.members.fetch();
    const connection = await this.client.db.getConnection();

    const [economyRows] = await connection.execute(
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
    connection.release();

    const usersData = (await db.get(`servers.${msg.guild.id}.users`)) || {};

    let totalCash = 0n;
    let totalBank = 0n;

    for (const userId in usersData) {
      const user = await this.client.users.cache.get(userId);
      if (user) {
        const cash = BigInt(usersData[userId].economy.cash || 0);
        const bank = BigInt(usersData[userId].economy.bank || 0);
        totalCash += cash;
        totalBank += bank;
      }
    }

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
