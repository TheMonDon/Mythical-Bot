const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class GiveMoney extends Command {
  constructor (client) {
    super(client, {
      name: 'give-money',
      description: 'Pay another user',
      category: 'Economy',
      usage: 'Give-Money <user> <amount | all>',
      aliases: ['givemoney', 'pay', 'send'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    let mem;

    const usage = `${msg.settings.prefix}Give-Money <user> <amount | all>`;
    const errEmbed = new EmbedBuilder()
      .setColor('#EC5454')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (!text || text.length < 1) {
      errEmbed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [errEmbed] });
    } else {
      mem = await getMember(msg, text[0]);
    }

    if (!mem) {
      errEmbed.setDescription(`That user was not found. \nUsage: ${usage}`);
      return msg.channel.send({ embeds: [errEmbed] });
    } else if (mem.id === msg.author.id) {
      errEmbed.setDescription('You cannot trade money with yourself. That would be pointless.');
      return msg.channel.send({ embeds: [errEmbed] });
    } else if (mem.user.bot) {
      errEmbed.setDescription('You can\'t give bots money.');
      return msg.channel.send({ embeds: [errEmbed] });
    }

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const authCash = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;

    let amount = text[1];
    amount = amount.replace(/,/g, '');
    amount = amount.replace(cs, '');
    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        amount = authCash;

        if (amount > authCash) {
          errEmbed.setDescription(`You don't have that much money to give. You currently have ${cs}${authCash}`);
          return msg.channel.send({ embeds: [errEmbed] });
        } else if (amount < 0) {
          errEmbed.setDescription('You can\'t give negative amounts of money.');
          return msg.channel.send({ embeds: [errEmbed] });
        } else if (amount === 0) {
          errEmbed.setDescription('You can\'t give someone nothing.');
          return msg.channel.send({ embeds: [errEmbed] });
        }

        db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount);
        db.add(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amount);

        const embed = new EmbedBuilder()
          .setColor('#04ACF4')
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`${mem} has received your ${cs}${amount.toLocaleString()}.`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#EC5454')
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }
    amount = parseInt(amount, 10);

    if (amount > authCash) {
      errEmbed.setDescription(`You don't have that much money to give. You currently have ${cs}${authCash.toLocaleString()}`);
      return msg.channel.send({ embeds: [errEmbed] });
    } else if (amount < 0) {
      errEmbed.setDescription('You can\'t give negative amounts of money.');
      return msg.channel.send({ embeds: [errEmbed] });
    } else if (amount === 0) {
      errEmbed.setDescription('You can\'t give someone nothing.');
      return msg.channel.send({ embeds: [errEmbed] });
    }

    db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount);
    db.add(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amount);

    const embed = new EmbedBuilder()
      .setColor('#0099CC')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`${mem} has received your ${cs}${amount.toLocaleString()}.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = GiveMoney;
