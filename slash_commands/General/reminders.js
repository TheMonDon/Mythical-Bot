const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('reminders')
  .setDescription('View or delete your reminders')
  .addStringOption((option) => option.setName('reminder_id').setDescription('The reminder to delete'));

exports.run = async (interaction) => {
  await interaction.deferReply();
  const reminderID = interaction.options.getString('reminder_id');

  const emoji = {
    0: '0⃣',
    1: '1⃣',
    2: '2⃣',
    3: '3⃣',
    4: '4⃣',
    5: '5⃣',
    6: '6⃣',
    7: '7⃣',
    8: '8⃣',
    9: '9⃣',
    10: '🔟',
  };
  const numbers = [
    emoji[0],
    emoji[1],
    emoji[2],
    emoji[3],
    emoji[4],
    emoji[5],
    emoji[6],
    emoji[7],
    emoji[8],
    emoji[9],
    emoji[10],
  ];
  const errorColor = interaction.settings.embedErrorColor;

  const em = new EmbedBuilder();
  const reminders = (await db.get('global.reminders')) || [];

  if (!reminderID) {
    let i = 1;
    for (const { triggerOn, reminder, userID, remID } of Object.values(reminders)) {
      if (userID === interaction.user.id) {
        const numberEmojiArray = [];

        // Check if number is in emoji array
        if (i in numbers) {
          numberEmojiArray.push(numbers[i]); // Single emoji representation
        } else if (i > Object.keys(numbers).length) {
          // Split digits and add corresponding emojis for numbers greater than available emojis
          String(i)
            .split('')
            .forEach((digit) => numberEmojiArray.push(numbers[digit]));
        }
        if (numberEmojiArray.join('')?.length < 1) numberEmojiArray.push(i);

        em.addFields([
          {
            name: `**${numberEmojiArray.join('') + '.'}** I'll remind you ${moment(
              triggerOn,
            ).fromNow()} (ID: ${remID})`,
            value: reminder.slice(0, 200),
          },
        ]);
        i += 1;
      }
    }

    em.setTitle(`To delete a reminder, use **\`/reminders <ID>\`**`).setColor(interaction.settings.embedColor);

    if (em?.data?.fields?.length !== 0) {
      em.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });
    } else {
      em.setDescription(
        `${interaction.user.username}, you don't have any reminders, use the **remindme** command to create a new one!`,
      );
    }

    return interaction.editReply({ embeds: [em] });
  }

  const reminder = await db.get(`global.reminders.${reminderID}`);

  if (!reminderID) {
    em.setColor(errorColor).setDescription(`${interaction.user.username}, that isn't a valid reminder.`);
  } else if (!reminder || reminder.userID !== interaction.user.id) {
    em.setColor(errorColor).setDescription(`${interaction.user.username}, that isn't a valid reminder.`);
  } else {
    await db.delete(`global.reminders.${reminderID}`);

    em.setColor(interaction.settings.embedSuccessColor).setDescription(
      `${interaction.user.username}, you've successfully deleted your reminder.`,
    );
  }
  return interaction.editReply({ embeds: [em] });
};
