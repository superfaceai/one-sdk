#![allow(unused_variables)]

use std::{
    collections::{BTreeMap, HashMap},
    ops::Index,
};

#[macro_export]
macro_rules! object {
    (
        $(
            $key: expr => $value: expr
        ),* $(,)?
    ) => {
        {
            let mut object = $crate::StructuredObject::new();
            $(
                object.set($key.into(), $value.into());
            )*

            $crate::StructuredValue::from(object)
        }
    };
}

#[derive(Clone)]
pub enum StructuredValue {
    Null,
    Object(StructuredObject),
    Array(Vec<StructuredValue>),
    String(String),
    Number(i64),
    Bool(bool),
}
impl StructuredValue {
    pub fn unwrap_object(&self) -> &StructuredObject {
        match self {
            Self::Object(o) => o,
            _ => panic!(),
        }
    }

    pub fn unwrap_array(&self) -> &[StructuredValue] {
        match self {
            Self::Array(a) => a,
            _ => panic!(),
        }
    }

    pub fn unwrap_str(&self) -> &str {
        match self {
            Self::String(s) => s,
            _ => panic!(),
        }
    }

    pub fn unwrap_number(&self) -> i64 {
        match self {
            Self::Number(n) => *n,
            _ => panic!(),
        }
    }

    pub fn get(&self, key: &str) -> Option<&StructuredValue> {
        self.unwrap_object().get(key)
    }

    pub fn iter(&self) -> impl Iterator<Item = &StructuredValue> {
        self.unwrap_array().iter()
    }
}
impl Index<&str> for StructuredValue {
    type Output = StructuredValue;

    fn index(&self, index: &str) -> &Self::Output {
        self.get(index).unwrap()
    }
}
impl<T: Into<StructuredValue>> From<Option<T>> for StructuredValue {
    fn from(value: Option<T>) -> Self {
        match value {
            None => Self::Null,
            Some(t) => t.into(),
        }
    }
}
impl From<usize> for StructuredValue {
    fn from(number: usize) -> Self {
        Self::Number(number.try_into().unwrap())
    }
}
impl From<&'_ str> for StructuredValue {
    fn from(value: &str) -> Self {
        Self::String(value.to_string())
    }
}
impl From<&'_ StructuredValue> for StructuredValue {
    fn from(value: &StructuredValue) -> Self {
        value.clone()
    }
}
impl From<StructuredObject> for StructuredValue {
    fn from(object: StructuredObject) -> Self {
        Self::Object(object)
    }
}
impl<T: Into<StructuredValue>> From<Vec<T>> for StructuredValue {
    fn from(array: Vec<T>) -> Self {
        Self::Array(array.into_iter().map(|v| v.into()).collect())
    }
}
impl From<&[StructuredValue]> for StructuredValue {
    fn from(array: &[StructuredValue]) -> Self {
        Self::Array(array.into_iter().cloned().collect())
    }
}

impl std::fmt::Debug for StructuredValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Null => write!(f, "Null"),
            Self::Object(obj) => f.debug_map().entries(obj.0.iter()).finish(),
            Self::Array(arr) => f.debug_list().entries(arr.iter()).finish(),
            Self::String(s) => write!(f, "\"{}\"", s),
            Self::Number(n) => write!(f, "{}", n),
            Self::Bool(b) => write!(f, "{}", b),
        }
    }
}

use serde_json::Value as JsonValue;
impl From<JsonValue> for StructuredValue {
    fn from(value: JsonValue) -> Self {
        match value {
            JsonValue::Null => Self::Null,
            JsonValue::Bool(b) => Self::Bool(b),
            JsonValue::Number(n) => Self::Number(n.as_i64().unwrap()),
            JsonValue::String(s) => Self::String(s),
            JsonValue::Array(array) => Self::Array(array.into_iter().map(|v| v.into()).collect()),
            JsonValue::Object(obj) => Self::Object(StructuredObject(BTreeMap::from_iter(
                obj.into_iter().map(|(key, value)| (key, value.into())),
            ))),
        }
    }
}

pub trait StructuredValueIterator<T: Into<StructuredValue>>: Iterator<Item = T> + Sized {
    fn collect_array(self) -> StructuredValue;
}
impl<T: Into<StructuredValue>, I: Iterator<Item = T>> StructuredValueIterator<T> for I {
    fn collect_array(self) -> StructuredValue {
        StructuredValue::Array(self.map(|v| v.into()).collect::<Vec<_>>())
    }
}

#[derive(Debug, Clone)]
pub struct StructuredObject(BTreeMap<String, StructuredValue>);
impl StructuredObject {
    pub fn new() -> Self {
        Self(BTreeMap::new())
    }

    pub fn get(&self, key: &str) -> Option<&StructuredValue> {
        self.0.get(key)
    }

    pub fn set(&mut self, key: String, value: StructuredValue) {
        self.0.insert(key, value);
    }
}

pub fn get_input() -> StructuredValue {
    object! {
        "page" => 1,
        "characterName" => "Luke Skywalker"
    }
}

pub fn set_output(output: Result<StructuredValue, StructuredValue>) {
    println!("Output: {:#?}", output);
}

#[macro_export]
macro_rules! multimap {
    (
        $(
            $key: expr => [$($value: expr),+ $(,)?]
        ),* $(,)?
    ) => {
        {
            let mut map = $crate::Multimap::new();
            $(
                $( map.add($key.into(), $value.into()); )+
            )*

            map
        }
    };
}
pub struct Multimap {
    map: HashMap<String, Vec<String>>,
}
impl Multimap {
    pub fn new() -> Self {
        Self {
            map: Default::default(),
        }
    }

    pub fn add(&mut self, key: String, value: String) {
        self.map.entry(key).or_default().push(value);
    }

    pub fn get(&self, key: &str) -> Option<&[String]> {
        self.map.get(key).map(|v| v.as_slice())
    }
}

pub fn http_request(
    method: &str,
    url: &str,
    headers: Multimap,
    query: Multimap,
    body: Option<StructuredValue>,
) -> Result<HttpResponse, HttpRequestError> {
    Ok(HttpResponse {
        status: 200,
        headers: multimap! {
            "content-type" => ["application/json"]
        },
        body: Some(serde_json::json!({
            // swapi
            "count": 1,
            "next": null,
            "previous": null,
            "results": [
                {
                    "name": "Luke Skywalker",
                    "height": "172",
                    "mass": "77",
                    "hair_color": "blond",
                    "skin_color": "fair",
                    "eye_color": "blue",
                    "birth_year": "19BBY",
                    "gender": "male",
                    "homeworld": "https://swapi.dev/api/planets/1/",
                    "films": [
                        "https://swapi.dev/api/films/1/",
                        "https://swapi.dev/api/films/2/",
                        "https://swapi.dev/api/films/3/",
                        "https://swapi.dev/api/films/6/"
                    ],
                    "species": [],
                    "vehicles": [
                        "https://swapi.dev/api/vehicles/14/",
                        "https://swapi.dev/api/vehicles/30/"
                    ],
                    "starships": [
                        "https://swapi.dev/api/starships/12/",
                        "https://swapi.dev/api/starships/22/"
                    ],
                    "created": "2014-12-09T13:50:51.644000Z",
                    "edited": "2014-12-20T21:17:56.891000Z",
                    "url": "https://swapi.dev/api/people/1/"
                }
            ],
            // bokun
            "data": {
                "experiences": {
                  "edges": [
                    {
                      "node": {
                        "id": "RXhwZXJpZW5jZToxNzk2NA",
                        "name": "Golden Bus Tour",
                        "briefDescription": null,
                        "description": "",
                        "categories": [],
                        "keywords": [],
                        "themes": [],
                        "images": [
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/0529d190-8222-4900-ad69-51b57e328805.jpeg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/0529d190-8222-4900-ad69-51b57e328805.jpeg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/0529d190-8222-4900-ad69-51b57e328805.jpeg?w=300&h=300"
                          }
                        ],
                        "videos": []
                      }
                    },
                    {
                      "node": {
                        "id": "RXhwZXJpZW5jZToxNzk2NQ",
                        "name": "Netvöktun",
                        "briefDescription": null,
                        "description": "",
                        "categories": [],
                        "keywords": [],
                        "themes": [],
                        "images": [
                          {
                            "caption": "",
                            "originalUrl": "https://imgcdn.bokun.tools/50c75de8-0bfe-4a6c-8d15-6050a6110b6d.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/50c75de8-0bfe-4a6c-8d15-6050a6110b6d.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/50c75de8-0bfe-4a6c-8d15-6050a6110b6d.jpg?w=300&h=300"
                          }
                        ],
                        "videos": []
                      }
                    },
                    {
                      "node": {
                        "id": "RXhwZXJpZW5jZToyMDgzMQ",
                        "name": "Canoe Rentals",
                        "briefDescription": "Glacier hike, Volcanoes &amp; Waterfalls is an easy South Coast tour with an adventurous twist. The sights are breathtaking, the grandeur unforgettable. Where else in the world can you stand on 700 years old glacier ice overlooking volcanoes,",
                        "description": "<p>Canoe</p><p><b>Included:</b> Map, 2 life jackets, 2 paddles, Shovel and water duck</p><div><br /></div>",
                        "categories": [
                          "WALKING_TOUR",
                          "ADRENALINE_AND_EXTREME"
                        ],
                        "keywords": [],
                        "themes": [
                          "ECO_FRIENDLY"
                        ],
                        "images": [
                          {
                            "caption": "test caption",
                            "originalUrl": "https://imgcdn.bokun.tools/7552e1cc-d2e2-4bf2-adee-2e49754c4f9f.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/7552e1cc-d2e2-4bf2-adee-2e49754c4f9f.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/7552e1cc-d2e2-4bf2-adee-2e49754c4f9f.jpg?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/5e03fa76-0493-4f10-8109-979db3d0c555.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/5e03fa76-0493-4f10-8109-979db3d0c555.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/5e03fa76-0493-4f10-8109-979db3d0c555.jpg?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/be7484d6-ad53-4002-8b3a-e248c9bde013.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/be7484d6-ad53-4002-8b3a-e248c9bde013.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/be7484d6-ad53-4002-8b3a-e248c9bde013.jpg?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/b0ca561c-2f9a-4fc7-a862-a7e7577a05f7.JPG",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/b0ca561c-2f9a-4fc7-a862-a7e7577a05f7.JPG?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/b0ca561c-2f9a-4fc7-a862-a7e7577a05f7.JPG?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/d4e37fa8-d5df-4074-aeb2-a778061cd838.JPG",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/d4e37fa8-d5df-4074-aeb2-a778061cd838.JPG?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/d4e37fa8-d5df-4074-aeb2-a778061cd838.JPG?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/2c6cebf6-8492-41df-9258-92ba646f47cd.png",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/2c6cebf6-8492-41df-9258-92ba646f47cd.png?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/2c6cebf6-8492-41df-9258-92ba646f47cd.png?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/de4f7e0c-f636-456d-98c6-98f7ca7113bf.PNG",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/de4f7e0c-f636-456d-98c6-98f7ca7113bf.PNG?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/de4f7e0c-f636-456d-98c6-98f7ca7113bf.PNG?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/1db65ba9-89c3-4e94-b37a-85ceea239914.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/1db65ba9-89c3-4e94-b37a-85ceea239914.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/1db65ba9-89c3-4e94-b37a-85ceea239914.jpg?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/fe2a6392-a2d4-40ff-984e-5336d349f235.png",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/fe2a6392-a2d4-40ff-984e-5336d349f235.png?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/fe2a6392-a2d4-40ff-984e-5336d349f235.png?w=300&h=300"
                          },
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/c2eb08d9-962c-4654-92fd-c383a0c60e1f.png",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/c2eb08d9-962c-4654-92fd-c383a0c60e1f.png?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/c2eb08d9-962c-4654-92fd-c383a0c60e1f.png?w=300&h=300"
                          }
                        ],
                        "videos": [
                          {
                            "name": null,
                            "sourceUrl": "https://www.youtube.com/watch?v=PSOY560gENo&feature=youtu.be",
                            "thumbnailUrl": "http://bokun.s3.amazonaws.com/video1025thumb",
                            "previewUrl": "http://bokun.s3.amazonaws.com/video1025preview"
                          }
                        ]
                      }
                    },
                    {
                      "node": {
                        "id": "RXhwZXJpZW5jZToyMjc1NA",
                        "name": "Golden Circle",
                        "briefDescription": "",
                        "description": "",
                        "categories": [],
                        "keywords": [],
                        "themes": [],
                        "images": [],
                        "videos": []
                      }
                    },
                    {
                      "node": {
                        "id": "RXhwZXJpZW5jZToyMjgxOA",
                        "name": "Jet boat adventure ",
                        "briefDescription": "ddd",
                        "description": "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum<br /></p><p><br /></p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum<br /></p>",
                        "categories": [],
                        "keywords": [],
                        "themes": [],
                        "images": [
                          {
                            "caption": null,
                            "originalUrl": "https://imgcdn.bokun.tools/70fc4559-f69d-44b1-b174-575cf3fce581.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/70fc4559-f69d-44b1-b174-575cf3fce581.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/70fc4559-f69d-44b1-b174-575cf3fce581.jpg?w=300&h=300"
                          },
                          {
                            "caption": "scuba diving for beginners in eilat",
                            "originalUrl": "https://imgcdn.bokun.tools/18a6ee4a-23bc-4afd-b72f-f47d04352979.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/18a6ee4a-23bc-4afd-b72f-f47d04352979.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/18a6ee4a-23bc-4afd-b72f-f47d04352979.jpg?w=300&h=300"
                          },
                          {
                            "caption": "scuba diving in eilat",
                            "originalUrl": "https://imgcdn.bokun.tools/d929b66e-1254-445a-94ef-fd4f9e6669f7.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/d929b66e-1254-445a-94ef-fd4f9e6669f7.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/d929b66e-1254-445a-94ef-fd4f9e6669f7.jpg?w=300&h=300"
                          },
                          {
                            "caption": "intro dive in eilat",
                            "originalUrl": "https://imgcdn.bokun.tools/784a2ddb-9830-4b45-84e8-1d8228d9582d.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/784a2ddb-9830-4b45-84e8-1d8228d9582d.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/784a2ddb-9830-4b45-84e8-1d8228d9582d.jpg?w=300&h=300"
                          },
                          {
                            "caption": "diving in eilat",
                            "originalUrl": "https://imgcdn.bokun.tools/8fe9b4c7-c265-4691-ac36-a5c4d9684934.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/8fe9b4c7-c265-4691-ac36-a5c4d9684934.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/8fe9b4c7-c265-4691-ac36-a5c4d9684934.jpg?w=300&h=300"
                          },
                          {
                            "caption": "diving lessons",
                            "originalUrl": "https://imgcdn.bokun.tools/cb280a8e-d3a1-41b2-8504-fcb9e5fb85ea.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/cb280a8e-d3a1-41b2-8504-fcb9e5fb85ea.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/cb280a8e-d3a1-41b2-8504-fcb9e5fb85ea.jpg?w=300&h=300"
                          },
                          {
                            "caption": "try scuba diving",
                            "originalUrl": "https://imgcdn.bokun.tools/275acb53-d573-40e2-9442-6578921dfe70.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/275acb53-d573-40e2-9442-6578921dfe70.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/275acb53-d573-40e2-9442-6578921dfe70.jpg?w=300&h=300"
                          },
                          {
                            "caption": "coral reef in Eilat",
                            "originalUrl": "https://imgcdn.bokun.tools/b20d2465-6801-4b2f-a43d-1c4cbe8f15c6.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/b20d2465-6801-4b2f-a43d-1c4cbe8f15c6.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/b20d2465-6801-4b2f-a43d-1c4cbe8f15c6.jpg?w=300&h=300"
                          },
                          {
                            "caption": "diving with instructor",
                            "originalUrl": "https://imgcdn.bokun.tools/a67ffa97-a6ae-47fc-a4be-6e5a3df0bf5e.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/a67ffa97-a6ae-47fc-a4be-6e5a3df0bf5e.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/a67ffa97-a6ae-47fc-a4be-6e5a3df0bf5e.jpg?w=300&h=300"
                          },
                          {
                            "caption": "diving center in Eilat",
                            "originalUrl": "https://imgcdn.bokun.tools/25d79a33-3575-4ca1-8a7b-bfdfdab9590d.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/25d79a33-3575-4ca1-8a7b-bfdfdab9590d.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/25d79a33-3575-4ca1-8a7b-bfdfdab9590d.jpg?w=300&h=300"
                          },
                          {
                            "caption": "introduction dive for beginners",
                            "originalUrl": "https://imgcdn.bokun.tools/93d794ec-8a74-4de7-904c-020601fc59ec.jpg",
                            "thumbnailUrl": "https://imgcdn.bokun.tools/93d794ec-8a74-4de7-904c-020601fc59ec.jpg?w=80&h=80&mode=crop",
                            "previewUrl": "https://imgcdn.bokun.tools/93d794ec-8a74-4de7-904c-020601fc59ec.jpg?w=300&h=300"
                          }
                        ],
                        "videos": []
                      }
                    },
                    {
                      "node": {
                        "id": "RXhwZXJpZW5jZToyMzc4Nw",
                        "name": "Take a walk on the wild side",
                        "briefDescription": "",
                        "description": "",
                        "categories": [],
                        "keywords": [],
                        "themes": [],
                        "images": [],
                        "videos": []
                      }
                    },
                    {
                      "node": {
                        "id": "RXhwZXJpZW5jZToyNDUxNw",
                        "name": "Combo take a walk on the wild side",
                        "briefDescription": "",
                        "description": "",
                        "categories": [],
                        "keywords": [],
                        "themes": [],
                        "images": [],
                        "videos": []
                      }
                    }
                  ],
                  "pageInfo": {
                    "endCursor": "RXhwZXJpZW5jZToyNQ",
                    "hasPreviousPage": false
                  },
                  "totalCount": 263
                }
              }
        }).into())
    })
}
pub enum HttpRequestError {
    Timeout,
}
pub struct HttpResponse {
    status: u16,
    headers: Multimap,
    body: Option<StructuredValue>,
}
impl HttpResponse {
    pub fn status(&self) -> u16 {
        self.status
    }

    pub fn content_type(&self) -> Option<&str> {
        self.headers
            .get("content-type")
            .and_then(|h| h.get(0).map(|s| s.as_str()))
    }

    pub fn body(&self) -> Option<&StructuredValue> {
        self.body.as_ref()
    }
}
