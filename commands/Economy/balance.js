const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Balance extends Command {
  constructor(client) {
    super(client, {
      name: 'balance',
      category: 'Economy',
      description: 'Get yours or another members balance',
      usage: 'balance [member]',
      aliases: ['bal', 'money'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let mem = msg.author;

    if (args && args.length > 0) {
      mem = await this.client.util.getMember(msg, args.join(' '));

      if (!mem) {
        const fid = args.join(' ').replace(/<@|>/g, '');
        try {
          mem = await this.client.users.fetch(fid);
        } catch (err) {
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid User');
        }
      }
      mem = mem.user ? mem.user : mem;
    }

    const embed = new EmbedBuilder().setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');

    const cash = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`)) ||
        (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) ||
        0,
    );
    const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`)) || 0);
    const netWorth = cash + bank;

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    let csCashAmount = currencySymbol + cash.toLocaleString();
    csCashAmount = csCashAmount.length > 1024 ? `${csCashAmount.slice(0, 1021) + '...'}` : csCashAmount;

    let csBankAmount = currencySymbol + bank.toLocaleString();
    csBankAmount = csBankAmount.length > 1024 ? `${csBankAmount.slice(0, 1021) + '...'}` : csBankAmount;

    let csNetWorthAmount = currencySymbol + netWorth.toLocaleString();
    csNetWorthAmount = csNetWorthAmount.length > 1024 ? `${csNetWorthAmount.slice(0, 1021) + '...'}` : csNetWorthAmount;

    embed
      .setAuthor({ name: mem.username, iconURL: mem.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .addFields([
        { name: 'Cash:', value: csCashAmount },
        { name: 'Bank:', value: csBankAmount },
        { name: 'Net Worth:', value: csNetWorthAmount },
      ])
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Balance;
