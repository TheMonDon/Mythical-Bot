const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class GiveMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'give-money',
      description: 'Pay another user',
      category: 'Economy',
      usage: 'give-money <user> <amount | all>',
      aliases: ['givemoney', 'pay', 'send'],
      requiredArgs: 2,
      guildOnly: true,
    });
  }

  async run(msg, text) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedErrorColor);

    const mem = await this.client.util.getMember(msg, text[0]);

    if (!mem) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    } else if (mem.id === msg.author.id) {
      return this.client.util.errorEmbed(msg, 'You cannot trade money with yourself. That would be pointless.');
    } else if (mem.user.bot) {
      return this.client.util.errorEmbed(msg, "You can't give bots money.");
    }

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const authCash = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`)) ||
        (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) ||
        0,
    );

    let amount = text[1].replace(/,/g, '').replace(currencySymbol, '');

    let csCashAmount = currencySymbol + authCash.toLocaleString();
    csCashAmount = csCashAmount.length > 1024 ? `${csCashAmount.slice(0, 1021) + '...'}` : csCashAmount;

    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        if (authCash <= BigInt(0))
          return this.client.util.errorEmbed(msg, "You can't pay someone when you have no money", 'Invalid Parameter');

        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, 0);
        const memCash = BigInt((await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`)) || 0);
        const newMemCash = memCash + authCash;
        await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newMemCash.toString());

        embed.setColor('#04ACF4').setDescription(`${mem} has received your ${csCashAmount}.`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
      }
    }
    amount = BigInt(parseInt(amount.replace(/[^0-9\\.]/g, '')));

    if (amount > authCash) {
      return this.client.util.errorEmbed(
        msg,
        `You don't have that much money to give. You currently have ${csCashAmount}`,
        'Invalid Parameter',
      );
    } else if (amount < BigInt(0)) {
      return this.client.util.errorEmbed(msg, "You can't give negative amounts of money.", 'Invalid Parameter');
    } else if (amount === BigInt(0)) {
      return this.client.util.errorEMbed(msg, "You can't give someone nothing.", 'Invalid Parameter');
    }

    const newAuthCash = authCash - amount;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAuthCash.toString());
    const memCash = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`)) ||
        (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) ||
        0,
    );
    const newMemCash = memCash + amount;
    await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newMemCash.toString());

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = csAmount.length > 1024 ? `${csAmount.slice(0, 1021) + '...'}` : csAmount;
    embed.setColor(msg.settings.embedColor).setDescription(`${mem} has received your ${csAmount}.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = GiveMoney;
