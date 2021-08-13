const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const db = require('quick.db');

module.exports = class Withdraw extends Command {
  constructor (client) {
    super(client, {
      name: 'withdraw',
      category: 'Economy',
      description: 'Withdraw your money from the bank',
      usage: 'withdraw <amount>',
      aliases: ['with'],
      guildOnly: true
    });
  }

  run (msg, text) {
    const p = msg.settings.prefix;
    let amount = text.join(' ');

    const usage = `${p}Withdraw <amount | all>`;
    if (!amount || amount.length < 1) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({embeds: [embed]});
    }

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const bank = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0; // store bank info prior to checking args
    const cash = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) || 0; // same thing but cash

    amount = amount.replace(/,/g, '');
    amount = amount.replace(cs, '');
    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        if (bank <= 0) return msg.channel.send('You don\'t have any money to withdraw.');
        if ((bank + cash) > Number.MAX_VALUE) {
          return msg.channel.send('You have too much cash to be able to withdraw all your bank');
        }

        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, 0);
        db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bank);

        const em = new DiscordJS.MessageEmbed()
          .setColor('#04ACF4')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(`Withdrew ${cs}${bank.toLocaleString()} from your bank!`);
        return msg.channel.send({embeds: [em]});
      } else {
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#EC5454')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send({embeds: [embed]});
      }
    }
    amount = parseInt(amount, 10);

    if (amount < 0) return msg.channel.send('You can\'t withdraw negative amounts of money.');
    if (amount > bank) return msg.channel.send(`You don't have that much money to withdraw. You currently have ${cs}${bank.toLocaleString()} in the bank.`);
    if (bank <= 0) return msg.channel.send('You don\'t have any money to withdraw.');
    if ((cash + amount) > Number.MAX_VALUE) {
      return msg.channel.send('You have too much cash to be able to withdraw that much money.');
    }

    db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, amount); // take money from bank
    db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount); // set money to cash

    const embed = new DiscordJS.MessageEmbed()
      .setColor('#04ACF4')
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setDescription(`Withdrew ${cs}${amount.toLocaleString()} from your bank!`);
    return msg.channel.send({embeds: [embed]});
  }
};
