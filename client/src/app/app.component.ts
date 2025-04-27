import { Component, AfterViewInit } from '@angular/core';

// Add this interface to declare the adsbygoogle property on the window object
interface WindowWithAdsense extends Window {
  adsbygoogle: any[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'Etymon';

  ngAfterViewInit() {
    // Initialize ads after view is initialized
    try {
      // Cast window to the custom interface
      const windowWithAds = window as unknown as WindowWithAdsense;
      windowWithAds.adsbygoogle = windowWithAds.adsbygoogle || [];
      windowWithAds.adsbygoogle.push({});
      windowWithAds.adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }
}
