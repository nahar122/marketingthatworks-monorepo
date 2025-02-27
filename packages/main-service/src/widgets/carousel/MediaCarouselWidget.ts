// // Import Lit dependencies
// import { Review } from '@marketingthatworks/shared-lib';
// import {LitElement, css, html} from 'lit';
// import {customElement, property} from 'lit/decorators.js';

// class ReviewCarousel extends LitElement {
//   static styles = css`
//     :host {
//       display: block;
//       position: relative;
//       width: 100%;
//       max-width: 100%;
//       margin: 0 auto;
//       overflow: hidden;
//     //   background-color: #f9f9f9;
//       border-radius: 16px;
//     //   box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//     }

//     .carousel {
//       display: flex;
//       transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
//       gap: 16px;
//     }

//     .review {
//       flex: 0 0 calc((100% / var(--visible-reviews, 1)) - 16px);
//       padding: 16px;
//       background-color: #fff;
//       display: flex;
//       flex-direction: column;
//       gap: 12px;
//       box-sizing: border-box;
//       background-color: #f9f9f9;
//       border-radius: 15px;
//     }

//     .review-header {
//       display: flex;
//       flex-direction: column;
//       // align-items: center;
//       gap: 12px;
//     }

    
//     .reviewer {
//       display: flex;
//       align-items: center;
//       gap: 12px;
//     }
    
//     .reviewer-info {
//       display: flex;
//       flex-direction: column;
//     }

//     .avatar {
//       width: 48px;
//       height: 48px;
//       background: linear-gradient(45deg, #8d38ff, #197bff);
//       border-radius: 50%;
//     }

//     .stars {
//       display: flex;
//       gap: 4px;
//     }

//     .star {
//       color: #ffd700;
//       font-size: 1.5rem;
//     }

//     .dots {
//       position: absolute;
//       bottom: 12px;
//       left: 50%;
//       transform: translateX(-50%);
//       display: flex;
//       gap: 8px;
//     }

//     .dot {
//       width: 8px;
//       height: 8px;
//       background-color: #ddd;
//       border-radius: 50%;
//       cursor: pointer;
//       transition: background-color 0.3s;
//     }

//     .dot.active {
//       background-color: #333;
//     }

//     .arrow {
//       position: absolute;
//       top: 50%;
//       transform: translateY(-50%);
//       width: 32px;
//       height: 32px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       background-color: rgba(17, 17, 17, 0.5);
//       fill: #fff;
//       border-radius: 50%;
//       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
//       cursor: pointer;
//       z-index: 10;
//       transition: background-color 0.3s;
//     }

//     .arrow:hover {
//       background-color: rgba(17, 17, 17, 0.7);
//     }

//     .arrow-left {
//       left: 16px;
//     }

//     .arrow-right {
//       right: 16px;
//     }

//     svg {
//       width: 16px;
//       height: 16px;
//     }

//     .review-container {
//       position: relative;
//       overflow: hidden;
//       padding: 16px;
//       box-sizing: border-box;
//     }
//   `;

  

//     static get properties() {
//         return {
//             reviews: {type: Array}, 
//             currentIndex: {type: Number}
//         }
//     }
//   constructor() {
//     super();
//     this.reviews = 
//     this.updateVisibleReviews();
//   }

//   connectedCallback() {
//     super.connectedCallback();
//     window.addEventListener('resize', this.updateVisibleReviews.bind(this));
//   }

//   disconnectedCallback() {
//     super.disconnectedCallback();
//     window.removeEventListener('resize', this.updateVisibleReviews.bind(this));
//   }

//   updateVisibleReviews() {
//     const width = window.innerWidth;
//     let visibleReviews = 1;

//     if (width >= 1200) {
//       visibleReviews = 5;
//     } else if (width >= 992) {
//       visibleReviews = 4;
//     } else if (width >= 768) {
//       visibleReviews = 3;
//     } else if (width >= 576) {
//       visibleReviews = 2;
//     }

//     if (this.reviews.length < visibleReviews) {
//         visibleReviews = this.reviews.length
//     }

//     this.style.setProperty('--visible-reviews', visibleReviews);
//     this.requestUpdate();
//   }

//   nextSlide() {
//     const visibleReviews = parseInt(getComputedStyle(this).getPropertyValue('--visible-reviews'), 10);
//     const maxIndex = Math.max(0, this.reviews.length - visibleReviews);
//     this.currentIndex = (this.currentIndex + 1) % (maxIndex + 1);
//     this.requestUpdate();
//   }

//   prevSlide() {
//     const visibleReviews = parseInt(getComputedStyle(this).getPropertyValue('--visible-reviews'), 10);
//     const maxIndex = Math.max(0, this.reviews.length - visibleReviews);
//     this.currentIndex = (this.currentIndex - 1 + (maxIndex + 1)) % (maxIndex + 1);
//     this.requestUpdate();
//   }

//   goToSlide(index) {
//     this.currentIndex = index;
//     this.requestUpdate();
//   }

//   renderStars(rating) {
//     return html`
//       <div class="stars">
//         ${Array(rating)
//           .fill(0)
//           .map(() => html`<span class="star">★</span>`)}
//         ${Array(5 - rating)
//           .fill(0)
//           .map(() => html`<span class="star" style="color: #ddd;">★</span>`)}
//       </div>
//     `;
//   }

//   render() {
//     const visibleReviews = parseInt(getComputedStyle(this).getPropertyValue('--visible-reviews'), 10);
//     const maxIndex = Math.max(0, this.reviews.length - visibleReviews);
//     return html`
//       <div class="review-us">$${this.averageRating}</div>
      
//       </div>
//       <div
//         class="carousel"
//         style="transform: translateX(-${this.currentIndex * (100 / visibleReviews)}%);"
//       >
//         ${this.reviews.map(
//           (review) => html`
//             <div class="review">
//               <div class="review-header"> 
//                 <div class="reviewer">                 
//                   <div class="avatar"></div>
//                   <div class="reviewer-info">
//                     <span class="font-semibold">${review.name}</span>
//                     <span><i>27 days ago</i></span>
//                   </div>
//                   </div>
//                   ${this.renderStars(review.rating)}
//                 </div>
//                 <p>${review.text}</p>
//             </div>
//           `
//         )}
//       </div>

//       <div class="dots">
//         ${Array(maxIndex + 1).fill(0).map(
//           (_, index) => html`
//             <div
//               class="dot ${index === this.currentIndex ? 'active' : ''}"
//               @click="${() => this.goToSlide(index)}"
//             ></div>
//           `
//         )}
//       </div>

//       <div class="arrow arrow-left" @click="${this.prevSlide}">
//         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
//           <path fill-rule="evenodd" d="M8.96 14.04a1 1 0 0 0 1.497-1.32l-.083-.094L5.747 8l4.627-4.626a1 1 0 0 0 .083-1.32l-.083-.094a1 1 0 0 0-1.32-.084l-.094.084-5.334 5.333a1 1 0 0 0-.083 1.32l.083.094 5.334 5.333Z"></path>
//         </svg>
//       </div>

//       <div class="arrow arrow-right" @click="${this.nextSlide}">
//         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
//           <path fill-rule="evenodd" d="M7.04 1.96a1 1 0 0 0-1.497 1.32l.083.094L10.253 8l-4.627 4.626a1 1 0 0 0 .083 1.32l-.083-.094a1 1 0 0 0 1.32.084l.094-.084 5.334-5.333a1 1 0 0 0 .083-1.32l-.083-.094L7.04 1.96Z"></path>
//         </svg>
//       </div>
//     `;
//   }
// }

// customElements.define('review-carousel', ReviewCarousel);
