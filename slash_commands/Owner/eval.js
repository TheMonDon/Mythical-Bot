/* eslint-disable no-eval */
/* eslint-disable no-unused-vars */
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { inspect } = require('util');
const { QuickDB } = require('quick.db');

exports.conf = {
  permLevel: 'Bot Owner',
};

exports.commandData = new SlashCommandBuilder()
  .setName('eval')
  .setDescription('Evaluate arbitrary JavaScript')
  .addStringOption((option) =>
    option.setName('query').setDescription('The code you want to evaluate').setRequired(true),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();

  const db = new QuickDB();
  const DiscordJS = require('discord.js');
  const util = interaction.client.util;
  const client = interaction.client;
  const msg = interaction;
  let promise = false;

  const embed = new EmbedBuilder().setFooter({
    text: interaction.user.tag,
    iconURL: interaction.user.displayAvatarURL(),
  });

  const code = (lang, code) =>
    `\`\`\`${lang}\n${String(code).slice(0, 4000) + (code.length >= 4000 ? '...' : '')}\n\`\`\``;

  const query = interaction.options.getString('query');

  try {
    let evald = eval(query);
    if (evald instanceof Promise) {
      evald = await evald;
      promise = true;
    }
    const res = typeof evald === 'string' ? evald : inspect(evald, { depth: 0 });
    const res2 = await util.clean(interaction.client, res);

    embed.setDescription(`Result ${promise ? '(Promise Awaited)' : ''} \n${code('js', res2)}`);

    if (!res || (!evald && evald !== 0)) embed.setColor(interaction.settings.embedErrorColor);
    else {
      embed
        .addFields([{ name: 'Type', value: code('css', typeof evald) }])
        .setColor(interaction.settings.embedSuccessColor);
    }
  } catch (error) {
    embed.addFields([{ name: 'Error', value: code('js', error) }]).setColor(interaction.settings.embedErrorColor);
  } finally {
    interaction.editReply({ embeds: [embed] }).catch((error) => {
      interaction.editRely(`There was an error while displaying the eval result! ${error.message}`);
    });
  }
};
