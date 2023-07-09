const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class GiveMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'give-money',
      description: 'Pay another user',
      category: 'Economy',
      usage: 'Give-Money <user> <amount | all>',
      aliases: ['givemoney', 'pay', 'send'],
      guildOnly: true,
    });
  }

  async run(msg, text) {
    let mem;
    const errorColor = msg.settings.embedErrorColor;

    const usage = `${msg.settings.prefix}Give-Money <user> <amount | all>`;
    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setAuthor({
        name: authorName,
        iconURL: msg.author.displayAvatarURL(),
      })
      .setColor(errorColor);

    if (!text || text.length < 1) {
      embed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [embed] });
    } else {
      mem = await this.client.util.getMember(msg, text[0]);
    }

    if (!mem) {
      embed.setDescription(`That user was not found. \nUsage: ${usage}`);
      return msg.channel.send({ embeds: [embed] });
    } else if (mem.id === msg.author.id) {
      embed.setDescription('You cannot trade money with yourself. That would be pointless.');
      return msg.channel.send({ embeds: [embed] });
    } else if (mem.user.bot) {
      embed.setDescription("You can't give bots money.");
      return msg.channel.send({ embeds: [embed] });
    }

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const authCash = parseFloat(
      db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );

    let amount = text[1];
    amount = amount.replace(/,/g, '');
    amount = amount.replace(currencySymbol, '');
    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        amount = authCash;

        if (amount > authCash) {
          embed.setDescription(
            `You don't have that much money to give. You currently have ${currencySymbol}${authCash}`,
          );
          return msg.channel.send({ embeds: [embed] });
        } else if (amount < 0) {
          embed.setDescription("You can't give negative amounts of money.");
          return msg.channel.send({ embeds: [embed] });
        } else if (amount === 0) {
          embed.setDescription("You can't give someone nothing.");
          return msg.channel.send({ embeds: [embed] });
        }

        db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount);
        db.add(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amount);

        embed
          .setColor('#04ACF4')
          .setDescription(`${mem} has received your ${currencySymbol}${amount.toLocaleString()}.`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder().setColor(errorColor).setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }
    amount = parseInt(amount, 10);

    if (amount > authCash) {
      embed.setDescription(
        `You don't have that much money to give. You currently have ${currencySymbol}${authCash.toLocaleString()}`,
      );
      return msg.channel.send({ embeds: [embed] });
    } else if (amount < 0) {
      embed.setDescription("You can't give negative amounts of money.");
      return msg.channel.send({ embeds: [embed] });
    } else if (amount === 0) {
      embed.setDescription("You can't give someone nothing.");
      return msg.channel.send({ embeds: [embed] });
    }

    db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount);
    db.add(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amount);

    embed
      .setColor(msg.settings.embedColor)
      .setDescription(`${mem} has received your ${currencySymbol}${amount.toLocaleString()}.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = GiveMoney;
