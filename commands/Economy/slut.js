const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
require('moment-duration-format');
const moment = require('moment');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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

  async run(msg) {
    const type = 'slut';

    const cooldown = (await db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`)) || 600;
    let userCooldown = (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`)) || {};

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft <= 1 || timeleft > cooldown * 1000) {
        // this is to check if the bot restarted before their cooldown was set.
        userCooldown = {};
        userCooldown.active = false;
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
        embed.setDescription(`Please wait ${tLeft} to be a slut again.`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    const cashValue = await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`);
    const startBalance = BigInt((await db.get(`servers.${msg.guild.id}.economy.startBalance`)) || 0);
    const cash = cashValue === undefined ? startBalance : BigInt(cashValue);

    const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`)) || 0);
    const authNet = cash + bank;

    // Get the min and max fine percentages
    const minFine = (await db.get(`servers.${msg.guild.id}.economy.${type}.fine.min`)) || 10;
    const maxFine = (await db.get(`servers.${msg.guild.id}.economy.${type}.fine.max`)) || 30;

    // randomFine is a random number between the minimum and maximum fail rate
    const randomFine = BigInt(Math.abs(Math.round(Math.random() * (maxFine - minFine + 1) + minFine)));

    // fineAmount is the amount of money the user will lose if they fail the action
    const fineAmount = bigIntAbs((authNet / BigInt(100)) * randomFine);

    // failRate is the percentage chance of the user failing the action
    const failRate = (await db.get(`servers.${msg.guild.id}.economy.${type}.failrate`)) || 35;
    const ranNum = Math.random() * 100;

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    delete require.cache[require.resolve('../../resources/messages/slut_success.json')];
    delete require.cache[require.resolve('../../resources/messages/slut_fail.json')];
    const crimeSuccess = require('../../resources/messages/slut_success.json');
    const crimeFail = require('../../resources/messages/slut_fail.json');

    if (ranNum < failRate) {
      let csAmount = currencySymbol + fineAmount.toLocaleString();
      csAmount = csAmount.length > 1024 ? csAmount.slice(0, 1021) + '...' : csAmount;

      const num = Math.floor(Math.random() * (crimeFail.length - 1)) + 1;
      const txt = crimeFail[num].replace('csamount', csAmount);

      embed.setDescription(txt).setFooter({ text: `Reply #${num.toLocaleString()}` });
      msg.channel.send({ embeds: [embed] });

      const newAmount = cash - fineAmount;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
    } else {
      const min = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.min`)) || 500;
      const max = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.max`)) || 2000;

      const amount = BigInt(Math.floor(Math.random() * (max - min + 1) + min));

      let csAmount = currencySymbol + amount.toLocaleString();
      csAmount = csAmount.length > 1024 ? csAmount.slice(0, 1021) + '...' : csAmount;

      const num = Math.floor(Math.random() * (crimeSuccess.length - 1)) + 1;
      const txt = crimeSuccess[num].replace('csamount', csAmount);

      embed
        .setDescription(txt)
        .setColor('#64BC6C')
        .setFooter({ text: `Reply #${num.toLocaleString()}` });
      msg.channel.send({ embeds: [embed] });

      const newAmount = cash + amount;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
    }

    userCooldown.time = Date.now() + cooldown * 1000;
    userCooldown.active = true;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);

    setTimeout(async () => {
      userCooldown = {};
      userCooldown.active = false;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
}

// Custom BigInt absolute function
function bigIntAbs(value) {
  return value < 0n ? -value : value;
}

module.exports = Slut;
