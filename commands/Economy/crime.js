const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const db = require('quick.db');

class Crime extends Command {
  constructor(client) {
    super(client, {
      name: 'crime',
      category: 'Economy',
      description: 'Commit a crime',
      examples: ['crime'],
      guildOnly: true,
    });
  }

  run(msg) {
    const type = 'crime';

    const cooldown = db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`) || 600;
    let userCooldown = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`) || {};
    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    // Check if the user is on cooldown
    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > cooldown * 1000) {
        // this is to check if the bot restarted before their cooldown was set.
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const timeLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
        embed.setDescription(`You cannot commit a crime for ${timeLeft}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    // Get the user's net worth
    const cash = BigInt(
      db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );
    const bank = BigInt(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0);
    const authNet = cash + bank;

    // Get the min and max amounts of money the user can get
    const min = db.get(`servers.${msg.guild.id}.economy.${type}.min`) || 500;
    const max = db.get(`servers.${msg.guild.id}.economy.${type}.max`) || 2000;

    // Get the min and max fine percentages
    const minFine = db.get(`servers.${msg.guild.id}.economy.${type}.fine.min`) || 10;
    const maxFine = db.get(`servers.${msg.guild.id}.economy.${type}.fine.max`) || 30;

    // randomFine is a random number between the minimum and maximum fail rate
    const randomFine = BigInt(Math.round(Math.random() * (maxFine - minFine + 1) + minFine));

    // fineAmount is the amount of money the user will lose if they fail the action
    const fineAmount = (authNet / BigInt(100)) * randomFine;

    const failRate = db.get(`servers.${msg.guild.id}.economy.${type}.failrate`) || 45;
    const ranNum = Math.random() * 100;

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    delete require.cache[require.resolve('../../resources/messages/crime_success.json')];
    delete require.cache[require.resolve('../../resources/messages/crime_fail.json')];
    const crimeSuccess = require('../../resources/messages/crime_success.json');
    const crimeFail = require('../../resources/messages/crime_fail.json');

    if (ranNum < failRate) {
      const csamount = currencySymbol + fineAmount.toLocaleString();
      const num = Math.floor(Math.random() * (crimeFail.length - 1)) + 1;

      embed
        .setColor(msg.settings.embedErrorColor)
        .setDescription(crimeFail[num].replace('csamount', csamount))
        .setFooter({ text: `Reply #${num.toLocaleString()}` });
      msg.channel.send({ embeds: [embed] });

      const newAmount = cash - fineAmount;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
    } else {
      const amount = BigInt(Math.floor(Math.random() * (max - min + 1) + min));
      const csamount = currencySymbol + amount.toLocaleString();
      const num = Math.floor(Math.random() * (crimeSuccess.length - 1)) + 1;

      embed
        .setColor(msg.settings.embedSuccessColor)
        .setDescription(crimeSuccess[num].replace('csamount', csamount))
        .setFooter({ text: `Reply #${num.toLocaleString()}` });
      msg.channel.send({ embeds: [embed] });

      const newAmount = cash + amount;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
    }

    userCooldown.time = Date.now() + cooldown * 1000;
    userCooldown.active = true;
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);

    // remove the cooldown after the specified time
    setTimeout(() => {
      userCooldown = {};
      userCooldown.active = false;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
}

module.exports = Crime;
