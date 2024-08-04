const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('work')
  .setDMPermission(false)
  .setDescription('Work for some extra money');

exports.run = async (interaction) => {
  await interaction.deferReply();
  const cooldown = (await db.get(`servers.${interaction.guild.id}.economy.work.cooldown`)) || 300; // get cooldown from database or set to 300 seconds
  let userCooldown =
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.work.cooldown`)) || {};

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedErrorColor)
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

  // Check if the user is on cooldown
  if (userCooldown.active) {
    const timeleft = userCooldown.time - Date.now();
    if (timeleft <= 1 || timeleft > cooldown * 1000) {
      userCooldown = {};
      userCooldown.active = false;
      await db.set(
        `servers.${interaction.guild.id}.users.${interaction.member.id}.economy.work.cooldown`,
        userCooldown,
      );
    } else {
      const tLeft = moment
        .duration(timeleft)
        .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');
      embed.setDescription(`You cannot work for ${tLeft}`);
      return interaction.editReply({ embeds: [embed] });
    }
  }

  const min = parseFloat((await db.get(`servers.${interaction.guild.id}.economy.work.min`)) || 50);
  const max = parseFloat((await db.get(`servers.${interaction.guild.id}.economy.work.max`)) || 500);

  const amount = Math.abs(Math.floor(Math.random() * (max - min + 1) + min));
  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';
  const csamount = currencySymbol + amount.toLocaleString();

  delete require.cache[require.resolve('../../resources/messages/work_jobs.json')];
  const jobs = require('../../resources/messages/work_jobs.json');

  const num = Math.floor(Math.random() * (jobs.length - 1)) + 1;
  const job = jobs[num].replace('{amount}', csamount);

  userCooldown.time = Date.now() + cooldown * 1000;
  userCooldown.active = true;
  await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.work.cooldown`, userCooldown);

  const oldBalance = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`)) ||
      (await db.get(`servers.${interaction.guild.id}.economy.startBalance`)) ||
      0,
  );

  const newBalance = oldBalance + BigInt(amount);
  await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`, newBalance.toString());

  embed
    .setColor(interaction.settings.embedSuccessColor)
    .setDescription(job)
    .setFooter({ text: `Reply #${num.toLocaleString()}` });
  interaction.editReply({ embeds: [embed] });

  setTimeout(async () => {
    userCooldown = {};
    userCooldown.active = false;
    await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.work.cooldown`, userCooldown);
  }, cooldown * 1000);
};
