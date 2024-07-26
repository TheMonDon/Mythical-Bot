const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

class Crime extends Command {
  constructor(client) {
    super(client, {
      name: 'crime',
      category: 'Economy',
      description: 'Commit a crime for a chance at some extra money',
      examples: ['crime'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const type = 'crime';

    const cooldown = (await db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`)) || 600;
    let userCooldown = (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`)) || {};

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    // Check if the user is on cooldown
    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft <= 1 || timeleft > cooldown * 1000) {
        userCooldown = {};
        userCooldown.active = false;
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const timeLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
        embed.setDescription(`You cannot commit a crime for ${timeLeft}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    // Get the user's net worth
    const cashValue = await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`);
    const startBalance = BigInt((await db.get(`servers.${msg.guild.id}.economy.startBalance`)) || 0);
    const cash = cashValue === undefined ? startBalance : BigInt(cashValue);

    const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`)) || 0);
    const authNet = cash + bank;

    // Get the min and max amounts of money the user can get
    const min = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.min`)) || 500;
    const max = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.max`)) || 2000;

    // Get the min and max fine percentages
    const minFine = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.fine.min`)) || 10;
    const maxFine = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.fine.max`)) || 30;

    // randomFine is a random number between the minimum and maximum fail rate
    const randomFine = BigInt(Math.abs(Math.round(Math.random() * (maxFine - minFine + 1) + minFine)));

    // fineAmount is the amount of money the user will lose if they fail the action
    const fineAmount = bigIntAbs((authNet / BigInt(100)) * randomFine);

    const failRate = (await db.get(`servers.${msg.guild.id}.economy.${type}.failrate`)) || 45;
    const ranNum = Math.random() * 100;

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

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
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
    } else {
      const amount = BigInt(Math.abs(Math.floor(Math.random() * (max - min + 1) + min)));
      const csamount = currencySymbol + amount.toLocaleString();
      const num = Math.floor(Math.random() * (crimeSuccess.length - 1)) + 1;

      embed
        .setColor(msg.settings.embedSuccessColor)
        .setDescription(crimeSuccess[num].replace('csamount', csamount))
        .setFooter({ text: `Reply #${num.toLocaleString()}` });
      msg.channel.send({ embeds: [embed] });

      const newAmount = cash + amount;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
    }

    userCooldown.time = Date.now() + cooldown * 1000;
    userCooldown.active = true;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);

    // remove the cooldown after the specified time
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

module.exports = Crime;
