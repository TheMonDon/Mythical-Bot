const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

class Work extends Command {
  constructor(client) {
    super(client, {
      name: 'work',
      category: 'Economy',
      description: 'Work for some extra money',
      usage: 'work',
      guildOnly: true,
    });
  }

  async run(msg) {
    const cooldown = (await db.get(`servers.${msg.guild.id}.economy.work.cooldown`)) || 300; // get cooldown from database or set to 300 seconds
    let userCooldown = (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.work.cooldown`)) || {};

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();

      if (timeleft > 0 && timeleft <= cooldown * 1000) {
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');
        embed.setDescription(`You cannot work for ${tLeft}`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        userCooldown = { active: false};
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.work.cooldown`, userCooldown);
      }
    }

    const min = Number(await db.get(`servers.${msg.guild.id}.economy.work.min`)) || 20;
    const max = Number(await db.get(`servers.${msg.guild.id}.economy.work.max`)) || 250;

    const amount = Math.abs(Math.floor(Math.random() * (max - min + 1) + min));
    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const csamount = currencySymbol + amount.toLocaleString();

    delete require.cache[require.resolve('../../resources/messages/work_jobs.json')];
    const jobs = require('../../resources/messages/work_jobs.json');

    const num = Math.floor(Math.random() * (jobs.length - 1)) + 1;
    const job = jobs[num].replace('{amount}', csamount);

    userCooldown.time = Date.now() + cooldown * 1000;
    userCooldown.active = true;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.work.cooldown`, userCooldown);

    const cashValue = await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`);
    const startBalance = BigInt((await db.get(`servers.${msg.guild.id}.economy.startBalance`)) || 0);
    const oldBalance = cashValue === undefined ? startBalance : BigInt(cashValue);

    const newBalance = oldBalance + BigInt(amount);
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newBalance.toString());

    embed
      .setColor(msg.settings.embedSuccessColor)
      .setDescription(job)
      .setFooter({ text: `Reply #${num.toLocaleString()}` });
    msg.channel.send({ embeds: [embed] });

    setTimeout(async () => {
      userCooldown = {};
      userCooldown.active = false;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.work.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
}

module.exports = Work;
