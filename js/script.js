// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');
const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const spaceFactElement = document.getElementById('spaceFact');

// Pick one space fact to show whenever the page loads.
const spaceFacts = [
	'A day on Venus is longer than a year on Venus.',
	'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
	'Olympus Mons on Mars is the tallest volcano in the solar system.',
	'Neptune was first located through mathematical predictions before it was observed.',
	'Moon footprints can last for millions of years because there is no wind or rain to erase them.',
	'Saturn has a lower average density than water.',
	'The International Space Station orbits Earth about every 90 minutes.',
	'Uranus rotates on its side, tilted about 98 degrees.'
];
const randomFactIndex = Math.floor(Math.random() * spaceFacts.length);
spaceFactElement.textContent = spaceFacts[randomFactIndex];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Fetch the APOD entries for the selected dates when the button is clicked.
getImagesButton.addEventListener('click', getSpaceImages);
closeModalButton.addEventListener('click', () => imageModal.close());

// Clicking the dark area around the dialog closes it.
imageModal.addEventListener('click', (event) => {
	if (event.target === imageModal) {
		imageModal.close();
	}
});

function showImageDetails(spaceImage) {
	modalImage.src = decodeHtmlEntities(spaceImage.hdurl);
	modalImage.alt = spaceImage.title;
	modalTitle.textContent = spaceImage.title;
	modalDate.textContent = formatDisplayDate(spaceImage.date);
	modalExplanation.textContent = getExplanationText(spaceImage.explanation);
	imageModal.showModal();
}

function formatDisplayDate(date) {
	const [year, month, day] = date.split('-').map(Number);
	const dateValue = new Date(Date.UTC(year, month - 1, day));
	return new Intl.DateTimeFormat('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(dateValue);
}

// Convert YYYY-MM-DD to NASA's required YYMMDD date format.
function toLegacyDate(date) {
	const [year, month, day] = date.split('-');
	return `${year.slice(2)}${month}${day}`;
}

// Decode HTML entities included in the APOD Basic feed.
function decodeHtmlEntities(value) {
	const textArea = document.createElement('textarea');
	textArea.innerHTML = value || '';
	return textArea.value;
}

function getExplanationText(explanation) {
	const decodedExplanation = decodeHtmlEntities(explanation);
	const explanationDocument = new DOMParser().parseFromString(decodedExplanation, 'text/html');
	return explanationDocument.body.textContent;
}

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate || startDate > endDate) {
		gallery.textContent = 'Choose a valid date range to continue.';
		return;
	}

	getImagesButton.disabled = true;
	getImagesButton.textContent = 'Loading...';
	gallery.textContent = 'Loading space photos...';

	try {
		const spaceImages = [];
		let page = 1;
		let hasMorePages = true;

		while (hasMorePages) {
			const url = new URL('https://science.nasa.gov/wp-json/wp/v2/apod-basic');
			url.searchParams.set('date_from', toLegacyDate(startDate));
			url.searchParams.set('date_to', toLegacyDate(endDate));
			url.searchParams.set('per_page', '25');
			url.searchParams.set('page', page);

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error('NASA could not load images for this date range. Please try again later.');
			}

			const pageOfImages = await response.json();

			if (!Array.isArray(pageOfImages)) {
				throw new Error('NASA returned data in an unexpected format.');
			}

			spaceImages.push(...pageOfImages);
			hasMorePages = pageOfImages.length === 25;
			page += 1;
		}

		gallery.replaceChildren();
		const matchingImages = spaceImages.filter((spaceImage) => (
			spaceImage.date >= startDate && spaceImage.date <= endDate
		));
		matchingImages.sort((firstImage, secondImage) => firstImage.date.localeCompare(secondImage.date));

		if (matchingImages.length === 0) {
			gallery.textContent = 'No APOD entries were found for this date range.';
			return;
		}

		matchingImages.forEach((spaceImage) => {
			const item = document.createElement('article');
			item.className = 'gallery-item';

			const title = document.createElement('h2');
			title.textContent = spaceImage.title;
			item.appendChild(title);

			const date = document.createElement('p');
			date.textContent = formatDisplayDate(spaceImage.date);
			item.appendChild(date);

			if (spaceImage.media_type === 'image' && spaceImage.hdurl) {
				const image = document.createElement('img');
				image.src = decodeHtmlEntities(spaceImage.hdurl);
				image.alt = spaceImage.title;
				item.appendChild(image);
				item.tabIndex = 0;
				item.setAttribute('role', 'button');
				item.setAttribute('aria-label', `View ${spaceImage.title} from ${formatDisplayDate(spaceImage.date)}`);
				item.addEventListener('click', () => showImageDetails(spaceImage));
				item.addEventListener('keydown', (event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						showImageDetails(spaceImage);
					}
				});
			} else {
				const videoLink = document.createElement('a');
				videoLink.href = spaceImage.permalink || spaceImage.url;
				if (spaceImage.media_type === 'video') {
					videoLink.textContent = 'Watch this APOD video on NASA';
				} else if (spaceImage.media_type === 'iframe') {
					videoLink.textContent = 'Open this APOD media on NASA';
				} else {
					videoLink.textContent = 'View this APOD entry';
				}
				videoLink.target = '_blank';
				videoLink.rel = 'noopener noreferrer';
				item.appendChild(videoLink);
			}

			gallery.appendChild(item);
		});
	} catch (error) {
		gallery.textContent = error.message;
	} finally {
		getImagesButton.disabled = false;
		getImagesButton.textContent = 'Get Space Images';
	}
}
