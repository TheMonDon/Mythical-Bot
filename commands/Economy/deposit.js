const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Deposit extends Command {
  constructor(client) {
    super(client, {
      name: 'deposit',
      category: 'Economy',
      description: 'Deposit your money into the bank',
      examples: ['deposit'],
      usage: 'deposit <amount | all>',
      aliases: ['dep'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let amount = args.join(' ');
    const currencySymbol = await db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    const cash = BigInt(
      await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) ||
        await db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );
    const bank = BigInt(await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0);
    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;

    const embed = new EmbedBuilder()
      .setColor('#04ACF4')
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    let csCashAmount = currencySymbol + cash.toLocaleString();
    csCashAmount = csCashAmount.length > 1024 ? `${csCashAmount.slice(0, 1021) + '...'}` : csCashAmount;

    amount = amount.replace(/,/g, '').replace(currencySymbol, '');
    if (isNaN(amount) || !amount) {
      if (amount.toLowerCase() === 'all') {
        if (cash <= BigInt(0))
          return this.client.util.errorEmbed(msg, "You don't have any cash to deposit.", 'Invalid Parameter');

        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, 0);
        const newAmount = bank + cash;
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, newAmount.toString());

        embed.setDescription(`Deposited ${csCashAmount} to your bank.`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Amount');
      }
    }
    amount = BigInt(amount.replace(/[^0-9\\.]/g, ''));

    if (amount < BigInt(0))
      return this.client.util.errorEmbed(msg, "You can't deposit negative amounts of cash", 'Invalid Parameter');
    if (amount > cash)
      return this.client.util.errorEmbed(
        msg,
        `You don't have that much money to deposit. You currently have ${csCashAmount} in cash.`,
        'Invalid Parameter',
      );
    if (cash <= BigInt(0))
      return this.client.util.errorEmbed(msg, "You don't have any cash to deposit", 'Invalid Parameter');

    const newCashAmount = cash - amount;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newCashAmount.toString());
    const newBankAmount = bank + amount;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, newBankAmount.toString());

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = csAmount.length > 1024 ? `${csAmount.slice(0, 1021) + '...'}` : csAmount;
    embed.setDescription(`Deposited ${csAmount} to your bank.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Deposit;
