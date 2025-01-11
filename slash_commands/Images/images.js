const { SlashCommandBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('images')
  .setDescription('Generate some images')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription("Displays you or the selected user's avatar with windows deletion menu.")
      .addUserOption((option) => option.setName('user').setDescription('The user to display the avatar of')),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('lgbt')
      .setDescription("Displays you or the selected user's avatar with the LGBT overlay.")
      .addUserOption((option) => option.setName('user').setDescription('The user to display the avatar of')),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('shit')
      .setDescription("Displays you or the selected user's avatar as stepped in shit")
      .addUserOption((option) => option.setName('user').setDescription('The user to display the avatar of')),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('wanted')
      .setDescription("Displays you or the selected user's avatar with on a wanted poster")
      .addUserOption((option) => option.setName('user').setDescription('The user to display the avatar of')),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('wasted')
      .setDescription("Displays you or the selected user's avatar with the GTA V Wasted overlay.")
      .addUserOption((option) => option.setName('user').setDescription('The user to display the avatar of')),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('yesno')
      .setDescription("Displays the author's and the selected user's avatars on a Yes/No background.")
      .addUserOption((option) =>
        option.setName('user').setDescription('The user to display the avatar of').setRequired(true),
      ),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const subcommand = interaction.options.getSubcommand();
  const user = interaction.options.getUser('user');

  let avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });
  const authorAvatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });
  let targetAvatarURL;
  if (user) {
    avatarURL = user.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });
    targetAvatarURL = user.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });
  }

  switch (subcommand) {
    case 'delete': {
      // Load the avatar and the background image
      const avatar = await loadImage(avatarURL);
      const backgroundPath = path.resolve(__dirname, '../../resources/images/DeleteMeme.jpg');
      const background = await loadImage(backgroundPath);

      // Create a canvas with the dimensions of the background
      const canvas = createCanvas(background.width, background.height);
      const ctx = canvas.getContext('2d');

      // Draw the background
      ctx.drawImage(background, 0, 0);

      // Resize and position the avatar
      const avatarWidth = 155;
      const avatarHeight = 155;
      const avatarX = 95; // X-coordinate
      const avatarY = 106; // Y-coordinate
      ctx.drawImage(avatar, avatarX, avatarY, avatarWidth, avatarHeight);

      // Send the result
      const attachment = canvas.toBuffer();
      return interaction.editReply({ files: [{ attachment, name: 'custom_avatar.png' }] });
    }

    case 'lgbt': {
      const avatar = await loadImage(avatarURL);
      const canvas = createCanvas(400, 400);
      const ctx = canvas.getContext('2d');

      // Draw the avatar
      ctx.drawImage(avatar, 0, 0, 400, 400);

      // Load and draw the "WASTED" banner
      const rainbowPath = path.resolve(__dirname, '../../resources/images/rainbow.png');
      const rainbow = await loadImage(rainbowPath);
      ctx.drawImage(rainbow, 0, 0, 400, 400);

      // Send the result
      const attachment = canvas.toBuffer();
      return interaction.editReply({ files: [{ attachment, name: 'custom_avatar.png' }] });
    }

    case 'shit': {
      const avatar = await loadImage(avatarURL);
      const canvas = createCanvas(600, 835);
      const ctx = canvas.getContext('2d');

      // Load and draw the shit image
      const shitPath = path.resolve(__dirname, '../../resources/images/plate_shit.png');
      const shit = await loadImage(shitPath);
      ctx.drawImage(shit, 0, 0, 600, 835);

      // Draw the avatar with rotation
      const avatarX = 220 + 75 / 2; // X-coordinate of the avatar's center
      const avatarY = 600 + 75 / 2; // Y-coordinate of the avatar's center
      const rotationAngle = (-40 * Math.PI) / 180; // Convert -30 degrees to radians (negative for counterclockwise)

      ctx.save(); // Save the current canvas state
      ctx.translate(avatarX, avatarY); // Move the canvas origin to the avatar's center
      ctx.rotate(rotationAngle); // Rotate the canvas counterclockwise
      ctx.drawImage(avatar, -75 / 2, -75 / 2, 75, 75); // Draw the avatar, offset by half its size
      ctx.restore(); // Restore the canvas state

      // Send the result
      const attachment = canvas.toBuffer();
      return interaction.editReply({ files: [{ attachment, name: 'custom_avatar.png' }] });
    }

    case 'wanted': {
      // Load the avatar and the background image
      const avatar = await loadImage(avatarURL);
      const backgroundPath = path.resolve(__dirname, '../../resources/images/wanted_poster.jpg');
      const background = await loadImage(backgroundPath);

      // Create a canvas with the dimensions of the background
      const canvas = createCanvas(background.width, background.height);
      const ctx = canvas.getContext('2d');

      // Draw the background
      ctx.drawImage(background, 0, 0);

      // Resize and position the avatar
      const avatarWidth = 400;
      const avatarHeight = 400;
      const avatarX = 170; // X-coordinate
      const avatarY = 305; // Y-coordinate
      ctx.drawImage(avatar, avatarX, avatarY, avatarWidth, avatarHeight);

      // Send the result
      const attachment = canvas.toBuffer();
      return interaction.editReply({ files: [{ attachment, name: 'custom_avatar.png' }] });
    }

    case 'wasted': {
      const avatar = await loadImage(avatarURL);
      const canvas = createCanvas(400, 400);
      const ctx = canvas.getContext('2d');

      // Draw the avatar
      ctx.drawImage(avatar, 0, 0, 400, 400);

      // Apply grayscale
      const imageData = ctx.getImageData(0, 0, 400, 400);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const grayscale = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        data[i] = grayscale; // Red
        data[i + 1] = grayscale; // Green
        data[i + 2] = grayscale; // Blue
      }
      ctx.putImageData(imageData, 0, 0);

      // Apply a very subtle blur
      ctx.globalAlpha = 0.9; // Slight transparency for layering
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          if (i !== 0 || j !== 0) {
            ctx.drawImage(canvas, i, j);
          }
        }
      }
      ctx.globalAlpha = 1.0; // Reset transparency

      // Load and draw the "WASTED" banner
      const wastedPath = path.resolve(__dirname, '../../resources/images/Wasted.png');
      const wasted = await loadImage(wastedPath);
      ctx.drawImage(wasted, 0, 100, 400, 200);

      // Send the result
      const attachment = canvas.toBuffer();
      return interaction.editReply({ files: [{ attachment, name: 'custom_avatar.png' }] });
    }

    case 'yesno': {
      // Load the avatars and background
      const authorAvatar = await loadImage(authorAvatarURL);
      const targetAvatar = await loadImage(targetAvatarURL);
      const backgroundPath = path.resolve(__dirname, '../../resources/images/yesno.png');
      const background = await loadImage(backgroundPath);

      // Create a canvas with the dimensions of the background
      const canvas = createCanvas(background.width, background.height);
      const ctx = canvas.getContext('2d');

      // Draw the background
      ctx.drawImage(background, 0, 0);

      // Resize and draw the avatars (swapped positions)
      const avatarWidth = 500;
      const avatarHeight = 500;

      // Target user's avatar (top position)
      const targetAvatarX = 870;
      const targetAvatarY = 15;
      ctx.drawImage(targetAvatar, targetAvatarX, targetAvatarY, avatarWidth, avatarHeight);

      // Author's avatar (bottom position)
      const authorAvatarX = 870;
      const authorAvatarY = 560;
      ctx.drawImage(authorAvatar, authorAvatarX, authorAvatarY, avatarWidth, avatarHeight);

      // Send the result
      const attachment = canvas.toBuffer();
      return interaction.editReply({ files: [{ attachment, name: 'custom_avatar.png' }] });
    }
  }
};
