import os
import sys
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, jsonify, request
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-key-issues-book-tracker')

# Sample/Fallback data for Vince Aletti's "Issues: A History of Photography in Fashion Magazines"
BOOK_FALLBACK_DATA = {
    "title": "Issues: A History of Photography in Fashion Magazines",
    "author": "Vince Aletti",
    "publisher": "Phaidon Press",
    "publication_date": "May 8, 2019",
    "isbn_10": "0714876789",
    "isbn_13": "978-0714876788",
    "pages": 272,
    "dimensions": "9.4 x 1.2 x 11.2 inches",
    "language": "English",
    "list_price": "$79.95",
    "current_price": "$71.95",
    "discount": "10%",
    "in_stock": True,
    "stock_status": "In Stock. Ships from and sold by Amazon.com.",
    "rating": "4.7 out of 5 stars",
    "reviews_count": 87,
    "cover_image_url": "/static/images/book_cover.jpg", # High-quality cover image
    "amazon_store_url": "https://www.amazon.com/amz-books/store",
    "amazon_product_url": "https://www.amazon.com/dp/0714876789",
    "description": (
        "Issues: A History of Photography in Fashion Magazines is the first book to gather "
        "and explore the history of fashion photography through the medium of the magazine page. "
        "Acclaimed photography critic Vince Aletti selects 100 significant magazine issues from "
        "his personal archive, spanning 1925 to 2018. The book showcases how photographers "
        "like Richard Avedon, Irving Penn, Cecil Beaton, Helmut Newton, and Wolfgang Tillmans "
        "used the fashion magazine as their primary laboratory."
    ),
    # The "Issues" (Chronological selections from Vince Aletti's personal archive)
    "magazine_issues": [
        {
            "id": "mag_1",
            "magazine": "Harper's Bazaar",
            "date": "October 1940",
            "photographer": "Louise Dahl-Wolfe",
            "cover_star": "Fashion Model",
            "significance": "Redefined the magazine's aesthetic with natural sunlight and active, modern outdoor photography.",
            "commentary": "Louise Dahl-Wolfe was the pioneer of outdoor fashion photography in color. This issue showcased a new type of independent, sporty American woman, far removed from the stiff studio portraits of the 1930s.",
            "category": "Classic Era",
            "image_slug": "harpers_1940"
        },
        {
            "id": "mag_2",
            "magazine": "Vogue US",
            "date": "May 1947",
            "photographer": "Irving Penn",
            "cover_star": "Classic Models",
            "significance": "Penn's early cover stripped fashion down to graphic essentials, introducing studio modernism.",
            "commentary": "Irving Penn brought a minimalist, clean, and painterly look to Vogue. This cover features twelve of the era's top models in a tight, structured group portrait that feels more like fine art than advertisement.",
            "category": "Classic Era",
            "image_slug": "vogue_1947"
        },
        {
            "id": "mag_3",
            "magazine": "Vogue US",
            "date": "March 1966",
            "photographer": "Richard Avedon",
            "cover_star": "Peggy Moffitt",
            "significance": "Captured the motion, energy, and youth culture of the 60s with Space Age fashion.",
            "commentary": "Richard Avedon's cover of Peggy Moffitt in Rudy Gernreich's space-age styling is legendary. Avedon famously declared that his camera captured not just clothes, but the spirit of a decade moving at high speed.",
            "category": "Golden Era",
            "image_slug": "vogue_1966"
        },
        {
            "id": "mag_4",
            "magazine": "Vogue Paris",
            "date": "October 1975",
            "photographer": "Helmut Newton",
            "cover_star": "Vibeke Knudsen",
            "significance": "Newton introduced cinematic narrative, mystery, and gender-bending sensuality.",
            "commentary": "Helmut Newton's iconic 'Rue Aubriot' photo session for Saint Laurent's Le Smoking tuxedo. By shooting a woman smoking on a dark Parisian street in menswear, Newton challenged traditional notions of gender, power, and desire.",
            "category": "Avant-Garde Era",
            "image_slug": "vogue_paris_1975"
        },
        {
            "id": "mag_5",
            "magazine": "i-D",
            "date": "November 1983",
            "photographer": "Nick Knight",
            "cover_star": "Sade Adu",
            "significance": "Defined the post-punk street-style and underground music aesthetic of 80s London.",
            "commentary": "Nick Knight's raw, high-contrast black-and-white portrait of Sade for the 'Wet & Dry' issue. i-D pioneered the 'straight-up' style document, elevating street subcultures and youth movements to fashion art.",
            "category": "Indie & Zines",
            "image_slug": "id_1983"
        },
        {
            "id": "mag_6",
            "magazine": "The Face",
            "date": "July 1984",
            "photographer": "Jamie Morgan",
            "cover_star": "Felix Howard",
            "significance": "The debut of the 'Buffalo' style collective, redefining masculinity, class, and style.",
            "commentary": "Featuring 13-year-old Felix Howard wearing a fedora and a killer stare, this issue launched the 'Buffalo' movement curated by Ray Petri. It blended sportswear, high fashion, and multiculturalism, transforming styling forever.",
            "category": "Indie & Zines",
            "image_slug": "the_face_1984"
        },
        {
            "id": "mag_7",
            "magazine": "Interview",
            "date": "October 1985",
            "photographer": "Richard Bernstein",
            "cover_star": "Grace Jones",
            "significance": "Andy Warhol's pop iconography at its height, combining celebrity gossip and airbrushed art.",
            "commentary": "Richard Bernstein's hyper-colored, airbrushed portrait of Grace Jones on the cover is a masterpiece of 80s pop art. Interview blurred the lines between high society, punk, art, and commerce.",
            "category": "Pop Culture",
            "image_slug": "interview_1985"
        },
        {
            "id": "mag_8",
            "magazine": "Harper's Bazaar",
            "date": "September 1992",
            "photographer": "Patrick Demarchelier",
            "cover_star": "Linda Evangelista",
            "significance": "Liz Tilberis's legendary debut issue, 'Enter the Era of Elegance'.",
            "commentary": "Often cited as one of the greatest magazine covers of all time. Linda Evangelista lifts a black mesh visor over one eye. It signaled a shift away from the excess of the 80s into the sleek, sophisticated minimalism of the 90s.",
            "category": "Minimalism Era",
            "image_slug": "harpers_1992"
        },
        {
            "id": "mag_9",
            "magazine": "W Magazine",
            "date": "September 2005",
            "photographer": "Steven Meisel",
            "cover_star": "Brad Pitt & Angelina Jolie",
            "significance": "Meisel's 60-page cinematic editorial 'Domestic Bliss' captured the mid-2000s cultural obsession.",
            "commentary": "Released right as rumors of 'Brangelina' took over tabloid news, Steven Meisel shot a fictional, highly stylized 1960s suburban family portrait. It was a brilliant, satirical commentary on celebrity culture and performance.",
            "category": "Modern Era",
            "image_slug": "w_2005"
        },
        {
            "id": "mag_10",
            "magazine": "Vogue Italia",
            "date": "July 2008",
            "photographer": "Steven Meisel",
            "cover_star": "Naomi Campbell, Liya Kebede, Sessilee Lopez",
            "significance": "The famous 'Black Issue', featuring exclusively black models to address racism in fashion.",
            "commentary": "Conceived by editor Franca Sozzani and shot entirely by Steven Meisel, this issue was a historic protest against the lack of diversity in the fashion industry. It sold out worldwide in days and remains a milestone in publishing.",
            "category": "Modern Era",
            "image_slug": "vogue_italia_2008"
        }
    ],
    # Store updates/alerts that can be emailed
    "updates": [
        {
            "id": "up_1",
            "title": "Price Drop Alert",
            "timestamp": "2026-06-16T09:30:00-07:00",
            "type": "Price Change",
            "details": "The book price on Amazon has dropped by 10% from the list price of $79.95 to $71.95. This is the lowest price recorded in the past 30 days.",
            "action_text": "Buy at $71.95"
        },
        {
            "id": "up_2",
            "title": "Inventory Stock Update",
            "timestamp": "2026-06-16T08:15:00-07:00",
            "type": "Stock Level",
            "details": "Only 4 copies of 'Issues' by Vince Aletti are currently left in stock at the Amazon Warehouse. Restocking is expected in 2 weeks, which might cause temp price increases.",
            "action_text": "Check Stock"
        },
        {
            "id": "up_3",
            "title": "New Reader Review Published",
            "timestamp": "2026-06-15T16:40:00-07:00",
            "type": "Review",
            "details": "★★★★★ Review from ArtHistorian88: 'An absolute bible for anyone interested in fashion, photography, or editorial design. The print quality is stunning and Vince Aletti's insights are unmatched.'",
            "action_text": "Read Full Review"
        },
        {
            "id": "up_4",
            "title": "Phaidon Publisher Note",
            "timestamp": "2026-06-14T11:00:00-07:00",
            "type": "Availability",
            "details": "Phaidon Press confirmed a limited reprint edition is coming. Second-hand market prices (currently averaging $120+ for signed copies) might stabilize soon.",
            "action_text": "View Publisher Page"
        }
    ]
}

def scrape_amazon_book_details():
    """
    Attempts to scrape details of the Vince Aletti 'Issues' book from Amazon.
    Uses headers to avoid bot detection. Falls back to pre-defined rich data if blocked.
    """
    url = "https://www.amazon.com/dp/0714876789"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    }

    scraped_data = BOOK_FALLBACK_DATA.copy()
    scraped_data["is_live"] = False
    
    try:
        logger.info(f"Attempting to scrape Amazon URL: {url}")
        # Use a reasonable timeout so the user isn't waiting indefinitely
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Simple check for captcha
            if "captcha" in response.text.lower() or "robot check" in response.text.lower():
                logger.warning("Amazon returned a Captcha page. Using rich cached data.")
                scraped_data["source"] = "Amazon (Cached due to Bot Protection)"
                return scraped_data

            # Try parsing Title
            title_span = soup.find('span', id='productTitle')
            if title_span:
                scraped_data["title"] = title_span.get_text().strip()
                logger.info(f"Successfully scraped title: {scraped_data['title']}")

            # Try parsing Price
            # Amazon prices can be in different divs depending on the page variant
            price_span = soup.find('span', class_='a-offscreen')
            if price_span:
                scraped_data["current_price"] = price_span.get_text().strip()
                logger.info(f"Scraped price: {scraped_data['current_price']}")
            else:
                price_amt = soup.find('span', id='price')
                if price_amt:
                    scraped_data["current_price"] = price_amt.get_text().strip()
            
            # Try parsing Stock Status
            availability_div = soup.find('div', id='availability')
            if availability_div:
                scraped_data["stock_status"] = availability_div.get_text().strip().replace('\n', ' ')
                scraped_data["in_stock"] = "in stock" in scraped_data["stock_status"].lower()
                logger.info(f"Scraped stock status: {scraped_data['stock_status']}")

            # Try parsing Review rating and counts
            rating_span = soup.find('span', class_='a-icon-alt')
            if rating_span:
                scraped_data["rating"] = rating_span.get_text().strip()
            
            reviews_count_span = soup.find('span', id='acrCustomerReviewText')
            if reviews_count_span:
                count_str = reviews_count_span.get_text().strip().split()[0]
                try:
                    scraped_data["reviews_count"] = int(count_str.replace(',', ''))
                except ValueError:
                    pass

            # Try parsing Cover Image
            img_tag = soup.find('img', id='imgBlkFront') or soup.find('img', id='landingImage')
            if img_tag and img_tag.has_attr('src'):
                scraped_data["cover_image_url"] = img_tag['src']

            scraped_data["is_live"] = True
            scraped_data["source"] = "Amazon Store (Live Scraped)"
            logger.info("Successfully scraped live data from Amazon.")
        else:
            logger.warning(f"Failed to scrape Amazon. Status code: {response.status_code}. Using cached data.")
            scraped_data["source"] = f"Amazon Store (Cached - Server returned {response.status_code})"
            
    except Exception as e:
        logger.error(f"Error occurred while scraping Amazon: {str(e)}. Using cached data.")
        scraped_data["source"] = f"Amazon Store (Cached - Error: {type(e).__name__})"

    return scraped_data

@app.route('/')
def index():
    """
    Renders the main dashboard page.
    """
    return render_template('index.html')

@app.route('/api/book-details')
def get_book_details():
    """
    API endpoint that triggers the scraper and returns book details, issues, and updates.
    """
    # Simple query parameter support to force fallback for design/testing purposes
    force_fallback = request.args.get('force_fallback', 'false').lower() == 'true'
    
    if force_fallback:
        data = BOOK_FALLBACK_DATA.copy()
        data["source"] = "Simulated Store Data"
        data["is_live"] = False
    else:
        data = scrape_amazon_book_details()
        
    return jsonify(data)

@app.route('/api/send-email', methods=['POST'])
def send_email():
    """
    Sends an email containing selected update details.
    Defaults to elena.dobrovolskaia.sqa@gmail.com.
    Simulates sending if SMTP is not configured, returning full details.
    """
    post_data = request.json or {}
    
    update_type = post_data.get('type', 'Update Notification')
    title = post_data.get('title', 'Issues Book Update')
    details = post_data.get('details', 'No details provided.')
    recipient = os.getenv('RECIPIENT_EMAIL', 'elena.dobrovolskaia.sqa@gmail.com')
    
    # SMTP Config from environment
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USERNAME', '')
    smtp_pass = os.getenv('SMTP_PASSWORD', '')
    sender = os.getenv('SENDER_EMAIL', 'noreply@issues-tracker.com')

    subject = f"[Issues Book Update] {update_type}: {title}"
    
    # Build HTML and Text body
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-top: 0;">
                Issues by Vince Aletti - Update Notification
            </h2>
            <p style="font-size: 16px; font-weight: bold; color: #1e1b4b; margin-bottom: 5px;">
                Type: {update_type}
            </p>
            <h3 style="font-size: 18px; margin-top: 0; color: #0f172a;">{title}</h3>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-style: italic; color: #334155;">"{details}"</p>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                Sent from the <strong>Issues by Vince Aletti Book Tracker</strong>. 
                <br>Recipient: {recipient}
            </p>
        </body>
    </html>
    """
    
    text_body = f"""
    Issues by Vince Aletti - Update Notification
    --------------------------------------------
    Type: {update_type}
    Title: {title}
    
    Details:
    "{details}"
    
    --------------------------------------------
    Sent from the Issues by Vince Aletti Book Tracker.
    Recipient: {recipient}
    """

    # If credentials are not set, we simulate sending and return a successful simulated response
    if not smtp_user or not smtp_pass:
        logger.info("SMTP Credentials not configured. Simulating email sending.")
        logger.info(f"SIMULATED EMAIL TO: {recipient}")
        logger.info(f"SUBJECT: {subject}")
        logger.info(f"TEXT BODY:\n{text_body}")
        
        return jsonify({
            "status": "simulated",
            "message": "Email sending simulated successfully. To send real emails, configure the SMTP credentials in your .env file.",
            "recipient": recipient,
            "subject": subject,
            "email_body": html_body,
            "smtp_server": smtp_server,
            "smtp_port": smtp_port
        })

    # If credentials are set, attempt to send real email
    try:
        logger.info(f"Attempting to send real email to {recipient} via {smtp_server}:{smtp_port}")
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = sender
        msg['To'] = recipient
        
        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Connect and Send
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(sender, [recipient], msg.as_string())
        server.quit()
        
        logger.info(f"Email successfully sent to {recipient}")
        return jsonify({
            "status": "success",
            "message": f"Email successfully sent to {recipient}!",
            "recipient": recipient,
            "subject": subject
        })
        
    except Exception as e:
        logger.error(f"Failed to send email via SMTP: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"SMTP Error: {str(e)}. Falling back to simulation.",
            "recipient": recipient,
            "subject": subject,
            "email_body": html_body,
            "error_details": str(e)
        }), 500

if __name__ == '__main__':
    # Default to port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
