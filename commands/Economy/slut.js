const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const db = require('quick.db');

class Slut extends Command {
  constructor(client) {
    super(client, {
      name: 'slut',
      category: 'Economy',
      description: 'Whip it out, for some quick cash ;)',
      aliases: ['whore', 'escort'],
      guildOnly: true,
    });
  }

  run(msg) {
    const type = 'slut';

    const cooldown = db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`) || 600;
    let userCooldown = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`) || {};

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > cooldown * 1000) {
        // this is to check if the bot restarted before their cooldown was set.
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
        embed.setDescription(`Please wait ${tLeft} to be a slut again.`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    const cash = parseFloat(
      db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );
    const bank = parseFloat(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0);
    const authNet = cash + bank;

    const min = db.get(`servers.${msg.guild.id}.economy.${type}.min`) || 500;
    const max = db.get(`servers.${msg.guild.id}.economy.${type}.max`) || 2000;

    // Get the min and max fine percentages
    const minFine = db.get(`servers.${msg.guild.id}.economy.${type}.fine.min`) || 10;
    const maxFine = db.get(`servers.${msg.guild.id}.economy.${type}.fine.max`) || 30;

    // randomFine is a random number between the minimum and maximum fail rate
    const randomFine = Math.round(Math.random() * (maxFine - minFine + 1) + minFine);

    // fineAmnt is the amount of money the user will lose if they fail the action
    const fineAmnt = Math.floor((authNet / 100) * randomFine);

    // failRate is the percentage chance of the user failing the action
    const failRate = db.get(`servers.${msg.guild.id}.economy.${type}.failrate`) || 45;
    const ranNum = Math.random() * 100;

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    delete require.cache[require.resolve('../../resources/messages/slut_success.json')];
    delete require.cache[require.resolve('../../resources/messages/slut_fail.json')];
    const crimeSuccess = require('../../resources/messages/slut_success.json');
    const crimeFail = require('../../resources/messages/slut_fail.json');

    if (ranNum < failRate) {
      if (isNaN(fineAmnt)) {
        return msg.channel.send('You have too much money to be able to be fined.');
      }

      const csamount = currencySymbol + fineAmnt.toLocaleString();
      const num = Math.floor(Math.random() * (crimeFail.length - 1)) + 1;
      const txt = crimeFail[num].replace('csamount', csamount);

      embed
        .setDescription(txt)
        .setFooter({ text: `Reply #${num.toLocaleString()}` });
      msg.channel.send({ embeds: [embed] });

      db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, fineAmnt);
    } else {
      const amount = Math.floor(Math.random() * (max - min + 1) + min);
      const csamount = currencySymbol + amount.toLocaleString();

      const num = Math.floor(Math.random() * (crimeSuccess.length - 1)) + 1;
      const txt = crimeSuccess[num].replace('csamount', csamount);

      embed
        .setDescription(txt)
        .setFooter({ text: `Reply #${num.toLocaleString()}` });
      msg.channel.send({ embeds: [embed] });

      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount);
    }

    userCooldown.time = Date.now() + cooldown * 1000;
    userCooldown.active = true;
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);

    setTimeout(() => {
      userCooldown = {};
      userCooldown.active = false;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
}

module.exports = Slut;
